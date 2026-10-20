<?php

namespace App\Controller\User;

use App\Service\MailerService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/profile')]
#[IsGranted('ROLE_USER')]
class ProfileController extends AbstractController
{
    // ─────────────────────────────────────────
    //  PROFILE PAGE
    // ─────────────────────────────────────────

    #[Route('', name: 'app_user_profile')]
    public function profile(): Response
    {
        return $this->render('user/profile.html.twig');
    }

    // ─────────────────────────────────────────
    //  UPDATE PROFILE (name, display name, avatar)
    // ─────────────────────────────────────────

    #[Route('/update', name: 'app_user_profile_update', methods: ['POST'])]
    public function updateProfile(Request $request, EntityManagerInterface $em): Response
    {
        $user = $this->getUser();

        $firstName = trim($request->request->get('first_name', ''));
        $lastName  = trim($request->request->get('last_name', ''));
        $displayName = trim($request->request->get('display_name', ''));

        if ($firstName !== '') {
            $user->setFirstName($firstName);
        }
        if ($lastName !== '') {
            $user->setLastName($lastName);
        }
        $user->setDisplayName($displayName ?: null);

        // Handle avatar upload
        $file = $request->files->get('avatar');
        if ($file && $file->isValid()) {
            $ext = $file->guessExtension() ?? 'png';
            $filename = 'avatar_' . $user->getId() . '_' . uniqid() . '.' . $ext;
            $dir = $this->getParameter('kernel.project_dir') . '/public/uploads/avatars';
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
            $file->move($dir, $filename);
            $user->setAvatarPath('/uploads/avatars/' . $filename);
        } elseif ($file && !$file->isValid()) {
            $this->addFlash('error', '⚠️ Avatar upload failed: ' . $file->getErrorMessage());
        }

        $em->flush();
        $this->addFlash('success', '✅ Profile updated successfully!');
        return $this->redirectToRoute('app_user_profile');
    }

    // ─────────────────────────────────────────
    //  REQUEST PASSWORD CHANGE (email verification)
    // ─────────────────────────────────────────

    #[Route('/request-password-change', name: 'app_user_request_password_change', methods: ['POST'])]
    public function requestPasswordChange(
        EntityManagerInterface $em,
        MailerService          $mailer
    ): Response {
        $user = $this->getUser();

        // Generate a secure token
        $token = bin2hex(random_bytes(32));
        $expiresAt = new \DateTime('+30 minutes');

        $user->setPasswordChangeToken($token);
        $user->setPasswordChangeTokenExpiresAt($expiresAt);
        $em->flush();

        // Generate verification URL
        $verificationUrl = $this->generateUrl('app_user_change_password', [
            'token' => $token,
        ], UrlGeneratorInterface::ABSOLUTE_URL);

        try {
            $mailer->sendPasswordChangeVerification($user, $verificationUrl);
            $this->addFlash('success', '📧 A verification link has been sent to your email. Please check your inbox to proceed with the password change.');
        } catch (\Exception $e) {
            $this->addFlash('error', 'Failed to send verification email. Please try again.');
        }

        return $this->redirectToRoute('app_user_profile');
    }

    // ─────────────────────────────────────────
    //  CHANGE PASSWORD (after email verification)
    // ─────────────────────────────────────────

    #[Route('/change-password/{token}', name: 'app_user_change_password', methods: ['GET', 'POST'])]
    public function changePassword(
        string                      $token,
        Request                     $request,
        EntityManagerInterface      $em,
        UserPasswordHasherInterface $passwordHasher
    ): Response {
        $user = $this->getUser();

        // Validate token
        if ($user->getPasswordChangeToken() !== $token) {
            $this->addFlash('error', 'Invalid verification token.');
            return $this->redirectToRoute('app_user_profile');
        }
        if ($user->getPasswordChangeTokenExpiresAt() < new \DateTime()) {
            $this->addFlash('error', 'This verification link has expired. Please request a new one.');
            return $this->redirectToRoute('app_user_profile');
        }

        if ($request->isMethod('POST')) {
            $newPassword = $request->request->get('new_password', '');
            $confirmPassword = $request->request->get('confirm_password', '');

            if (strlen($newPassword) < 6) {
                $this->addFlash('error', 'Password must be at least 6 characters.');
                return $this->redirectToRoute('app_user_change_password', ['token' => $token]);
            }

            if ($newPassword !== $confirmPassword) {
                $this->addFlash('error', 'Passwords do not match.');
                return $this->redirectToRoute('app_user_change_password', ['token' => $token]);
            }

            $user->setPassword($passwordHasher->hashPassword($user, $newPassword));
            $user->setPasswordChangeToken(null);
            $user->setPasswordChangeTokenExpiresAt(null);
            $em->flush();

            $this->addFlash('success', '🔒 Password changed successfully!');
            return $this->redirectToRoute('app_user_profile');
        }

        return $this->render('user/change_password.html.twig', [
            'token' => $token,
        ]);
    }
}
