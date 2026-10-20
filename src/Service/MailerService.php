<?php

namespace App\Service;

use App\Entity\User;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;

class MailerService
{
    private MailerInterface $mailer;
    private string $senderEmail;
    private string $senderName;

    public function __construct(MailerInterface $mailer, string $senderEmail = 'virtuarts.esprim@gmail.com', string $senderName = 'VirtuArts')
    {
        $this->mailer = $mailer;
        $this->senderEmail = $senderEmail;
        $this->senderName = $senderName;
    }

    // ─────────────────────────────────────────
    //  1. PASSWORD RESET EMAIL
    // ─────────────────────────────────────────

    public function sendPasswordResetEmail(User $user, string $resetUrl): void
    {
        $email = (new TemplatedEmail())
            ->from(new Address($this->senderEmail, $this->senderName))
            ->to(new Address($user->getEmail(), $user->getFullName()))
            ->subject('Reset Your VirtuArts Password')
            ->htmlTemplate('email/password_reset.html.twig')
            ->context([
                'user' => $user,
                'resetUrl' => $resetUrl,
                'expiresIn' => '1 hour',
            ]);

        $this->mailer->send($email);
    }

    // ─────────────────────────────────────────
    //  2. USER BLOCKED NOTIFICATION
    // ─────────────────────────────────────────

    public function sendBlockNotification(User $user, string $reason, string $supervisorName): void
    {
        $email = (new TemplatedEmail())
            ->from(new Address($this->senderEmail, $this->senderName))
            ->to(new Address($user->getEmail(), $user->getFullName()))
            ->subject('Your VirtuArts Account Has Been Blocked')
            ->htmlTemplate('email/user_blocked.html.twig')
            ->context([
                'user' => $user,
                'reason' => $reason,
                'supervisorName' => $supervisorName,
            ]);

        $this->mailer->send($email);
    }

    // ─────────────────────────────────────────
    //  3. SUPERVISOR ACCOUNT CREATED
    // ─────────────────────────────────────────

    public function sendSupervisorWelcomeEmail(
        User   $supervisor,
        string $temporaryPassword,
        string $moduleName,
        string $loginUrl
    ): void {
        $email = (new TemplatedEmail())
            ->from(new Address($this->senderEmail, $this->senderName))
            ->to(new Address($supervisor->getEmail(), $supervisor->getFullName()))
            ->subject('Welcome to VirtuArts — Your Supervisor Account')
            ->htmlTemplate('email/supervisor_welcome.html.twig')
            ->context([
                'user' => $supervisor,
                'temporaryPassword' => $temporaryPassword,
                'moduleName' => $moduleName,
                'loginUrl' => $loginUrl,
            ]);

        $this->mailer->send($email);
    }

    // ─────────────────────────────────────────
    //  4. PASSWORD CHANGE VERIFICATION
    // ─────────────────────────────────────────

    public function sendPasswordChangeVerification(User $user, string $verificationUrl): void
    {
        $email = (new TemplatedEmail())
            ->from(new Address($this->senderEmail, $this->senderName))
            ->to(new Address($user->getEmail(), $user->getFullName()))
            ->subject('VirtuArts — Verify Your Password Change')
            ->htmlTemplate('email/password_change_verification.html.twig')
            ->context([
                'user' => $user,
                'verificationUrl' => $verificationUrl,
                'expiresIn' => '30 minutes',
            ]);

        $this->mailer->send($email);
    }
}
