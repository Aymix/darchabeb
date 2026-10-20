<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Authentication\AuthenticationUtils;

class SecurityController extends AbstractController
{
    #[Route('/login', name: 'app_login')]
    public function login(AuthenticationUtils $authenticationUtils): Response
    {
        // If already logged in, redirect to appropriate dashboard
        if ($this->getUser()) {
            return $this->redirectToRoute('app_login_redirect');
        }

        $error = $authenticationUtils->getLastAuthenticationError();
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('security/login.html.twig', [
            'last_username' => $lastUsername,
            'error' => $error,
        ]);
    }

    #[Route('/login/redirect', name: 'app_login_redirect')]
    public function loginRedirect(): Response
    {
        $user = $this->getUser();

        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        // Check if user is blocked
        if ($user->isBlocked()) {
            $this->addFlash('danger', 'Your account has been blocked by a supervisor. Please contact the administration.');
            return $this->redirectToRoute('app_logout');
        }

        // Personalized welcome message based on login history
        if ($user->getLoginCount() <= 1) {
            // First-time login (login_count was just incremented to 1 by LoginSuccessListener)
            $this->addFlash('success', '🎉 Welcome to VirtuArts, ' . $user->getFirstName() . '! Let\'s start creating!');
        } else {
            $this->addFlash('success', '👋 Welcome back, ' . $user->getFirstName() . '!');
        }

        // Redirect based on role — mirrors Java LoginController.onLoginClick()
        if ($this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_admin_dashboard');
        }

        if ($this->isGranted('ROLE_SUPERVISOR')) {
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        return $this->redirectToRoute('app_user_dashboard');
    }

    #[Route('/logout', name: 'app_logout')]
    public function logout(): void
    {
        // This method is intercepted by the Symfony security firewall
        throw new \LogicException('This should never be reached.');
    }
}
