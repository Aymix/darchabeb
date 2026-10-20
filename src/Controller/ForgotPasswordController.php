<?php

namespace App\Controller;

use App\Entity\ResetPasswordToken;
use App\Repository\ResetPasswordTokenRepository;
use App\Repository\UserRepository;
use App\Service\MailerService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class ForgotPasswordController extends AbstractController
{
    // ─────────────────────────────────────────
    //  STEP 1: Request password reset (enter email)
    // ─────────────────────────────────────────

    #[Route('/forgot-password', name: 'app_forgot_password', methods: ['GET', 'POST'])]
    public function request(
        Request                $request,
        UserRepository         $userRepo,
        ResetPasswordTokenRepository $tokenRepo,
        EntityManagerInterface $em,
        MailerService          $mailer
    ): Response {
        if ($request->isMethod('POST')) {
            $email = trim((string) $request->request->get('email', ''));

            // Always show generic success to prevent user enumeration
            $this->addFlash('success', 'If an account with that email exists, a password reset link has been sent to your inbox.');

            $user = $userRepo->findOneBy(['email' => $email]);
            if ($user) {
                // Invalidate any previous tokens for this user
                $tokenRepo->invalidateTokensForUser($user);

                // Create a new secure token (expires in 60 minutes)
                $resetToken = ResetPasswordToken::create($user, 60);
                $em->persist($resetToken);
                $em->flush();

                // Generate the reset URL with the token
                $resetUrl = $this->generateUrl('app_reset_password', [
                    'token' => $resetToken->getToken(),
                ], UrlGeneratorInterface::ABSOLUTE_URL);

                // Send the email
                try {
                    $mailer->sendPasswordResetEmail($user, $resetUrl);
                } catch (\Exception $e) {
                    // Log error but don't expose to user
                    // In dev, you can add: $this->addFlash('error', $e->getMessage());
                }
            }

            return $this->redirectToRoute('app_forgot_password');
        }

        return $this->render('security/forgot_password.html.twig');
    }

    // ─────────────────────────────────────────
    //  STEP 2: Reset password (via token link)
    // ─────────────────────────────────────────

    #[Route('/reset-password/{token}', name: 'app_reset_password', methods: ['GET', 'POST'])]
    public function reset(
        string                      $token,
        Request                     $request,
        ResetPasswordTokenRepository $tokenRepo,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface      $em
    ): Response {
        // Find and validate the token
        $resetToken = $tokenRepo->findValidToken($token);

        if (!$resetToken) {
            $this->addFlash('error', 'This password reset link is invalid or has expired. Please request a new one.');
            return $this->redirectToRoute('app_forgot_password');
        }

        $user = $resetToken->getUser();

        if ($request->isMethod('POST')) {
            $newPassword = $request->request->get('password', '');
            $confirmPassword = $request->request->get('password_confirm', '');

            if (strlen($newPassword) < 6) {
                $this->addFlash('error', 'Password must be at least 6 characters.');
                return $this->redirectToRoute('app_reset_password', ['token' => $token]);
            }

            if ($newPassword !== $confirmPassword) {
                $this->addFlash('error', 'Passwords do not match.');
                return $this->redirectToRoute('app_reset_password', ['token' => $token]);
            }

            // Update password
            $user->setPassword($passwordHasher->hashPassword($user, $newPassword));

            // Mark token as used
            $resetToken->setUsed(true);
            $em->flush();

            $this->addFlash('success', 'Your password has been reset successfully! You can now sign in.');
            return $this->redirectToRoute('app_login');
        }

        return $this->render('security/reset_password.html.twig', [
            'user' => $user,
            'token' => $token,
        ]);
    }
}
