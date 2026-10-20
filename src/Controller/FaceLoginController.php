<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\FaceAuthService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Face ID login (webcam face match).
 *
 *  POST /login/face            sign in with email + face template
 *  POST /profile/face/enable   turn Face ID on (requires current password + 3+ face captures)
 *  POST /profile/face/disable  turn Face ID off and delete the stored template
 */
class FaceLoginController extends AbstractController
{
    private const GENERIC_FAILURE = 'Face not recognised. Try again in good light, or sign in with your password.';

    public function __construct(private FaceAuthService $face)
    {
    }

    #[Route('/login/face', name: 'app_login_face', methods: ['POST'])]
    public function login(Request $request, UserRepository $users, Security $security): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !$this->isCsrfTokenValid('face_login', (string) ($data['_token'] ?? ''))) {
            return $this->json(['ok' => false, 'error' => 'Your session expired. Reload the page and try again.'], Response::HTTP_FORBIDDEN);
        }

        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $ip = (string) $request->getClientIp();
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['ok' => false, 'error' => 'Enter your email address first.'], Response::HTTP_BAD_REQUEST);
        }
        if ($this->face->isLocked($email, $ip)) {
            return $this->json(['ok' => false, 'error' => 'Too many attempts. Please wait 15 minutes or sign in with your password.'], Response::HTTP_TOO_MANY_REQUESTS);
        }

        $descriptor = $this->face->sanitize($data['descriptor'] ?? null);
        /** @var User|null $user */
        $user = $users->findOneBy(['email' => $email]);

        // Same answer for unknown email, Face ID off, or no match — don't reveal which accounts exist.
        if ($descriptor === null || !$user || !$user->isFaceLoginEnabled() || !$this->face->matches($user->getFaceDescriptor(), $descriptor)) {
            $this->face->recordFailure($email, $ip);
            return $this->json(['ok' => false, 'error' => self::GENERIC_FAILURE], Response::HTTP_UNAUTHORIZED);
        }

        if ($user->isBlocked()) {
            return $this->json(['ok' => false, 'error' => 'Your account has been blocked by a supervisor. Please contact the administration.'], Response::HTTP_FORBIDDEN);
        }

        $this->face->clearFailures($email, $ip);
        $security->login($user, 'form_login', 'main');

        return $this->json(['ok' => true, 'redirect' => $this->generateUrl('app_login_redirect')]);
    }

    #[Route('/profile/face/enable', name: 'app_user_face_enable', methods: ['POST'])]
    public function enable(Request $request, UserPasswordHasherInterface $hasher, EntityManagerInterface $em): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !$this->isCsrfTokenValid('face_enroll', (string) ($data['_token'] ?? ''))) {
            return $this->json(['ok' => false, 'error' => 'Your session expired. Reload the page and try again.'], Response::HTTP_FORBIDDEN);
        }
        if (!$hasher->isPasswordValid($user, (string) ($data['password'] ?? ''))) {
            return $this->json(['ok' => false, 'error' => 'Incorrect password.'], Response::HTTP_UNAUTHORIZED);
        }

        $result = $this->face->buildTemplate(is_array($data['samples'] ?? null) ? $data['samples'] : []);
        if ($result['descriptor'] === null) {
            return $this->json(['ok' => false, 'error' => $result['error']], Response::HTTP_BAD_REQUEST);
        }

        $user->enableFaceLogin($result['descriptor']);
        $em->flush();

        return $this->json(['ok' => true, 'message' => 'Face ID login is on.']);
    }

    #[Route('/profile/face/disable', name: 'app_user_face_disable', methods: ['POST'])]
    public function disable(Request $request, EntityManagerInterface $em): Response
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_REMEMBERED');
        /** @var User $user */
        $user = $this->getUser();

        if (!$this->isCsrfTokenValid('face_disable', (string) $request->request->get('_token'))) {
            $this->addFlash('error', 'Your session expired. Please try again.');
            return $this->redirectToRoute('app_user_profile');
        }

        $user->disableFaceLogin();
        $em->flush();
        $this->addFlash('success', 'Face ID login is off and your face template was deleted.');

        return $this->redirectToRoute('app_user_profile');
    }
}
