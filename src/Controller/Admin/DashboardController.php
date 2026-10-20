<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\ActivityModuleRepository;
use App\Repository\MuseumSubmissionRepository;
use App\Repository\UserRepository;
use App\Service\MailerService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin')]
#[IsGranted('ROLE_ADMIN')]
class DashboardController extends AbstractController
{
    #[Route('', name: 'app_admin_dashboard')]
    public function index(
        UserRepository             $userRepo,
        ActivityModuleRepository   $moduleRepo,
        MuseumSubmissionRepository $subRepo
    ): Response {
        $roleStats       = $userRepo->countByRole();
        $supervisorCount = $roleStats['SUPERVISEUR'] ?? 0;

        return $this->render('admin/dashboard.html.twig', [
            'totalUsers'       => $userRepo->count([]),
            'activeModules'    => count($moduleRepo->findAllActive()),
            'supervisorCount'  => $supervisorCount,
            'recentSubmissions'=> $subRepo->findBy([], ['id' => 'DESC'], 5),
            'modules'          => $moduleRepo->findAll(),
        ]);
    }

    // ─────────────────────────────────────────────
    //  CREATE SUPERVISOR ACCOUNT + SEND EMAIL
    // ─────────────────────────────────────────────

    #[Route('/create-supervisor', name: 'app_admin_create_supervisor', methods: ['POST'])]
    public function createSupervisor(
        Request                     $request,
        EntityManagerInterface      $em,
        UserPasswordHasherInterface $hasher,
        MailerService               $mailer,
        ActivityModuleRepository    $moduleRepo
    ): Response {
        // Validate inputs
        $firstName = trim((string) $request->request->get('first_name', ''));
        $lastName  = trim((string) $request->request->get('last_name', ''));
        $email     = trim((string) $request->request->get('email', ''));
        $moduleId  = $request->request->get('module_id', '');

        if ($firstName === '' || $lastName === '' || $email === '') {
            $this->addFlash('error', 'All fields (first name, last name, email) are required.');
            return $this->redirectToRoute('app_admin_dashboard');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->addFlash('error', 'Invalid email address.');
            return $this->redirectToRoute('app_admin_dashboard');
        }

        // Check if email already exists
        $existingUser = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existingUser) {
            $this->addFlash('error', sprintf('A user with email "%s" already exists.', $email));
            return $this->redirectToRoute('app_admin_dashboard');
        }

        // Generate a secure temporary password
        $temporaryPassword = bin2hex(random_bytes(6)); // 12-char random password

        // Get the assigned module name
        $moduleName = 'General';
        if ($moduleId) {
            $module = $moduleRepo->find($moduleId);
            if ($module) {
                $moduleName = $module->getName();
            }
        }

        // Create the supervisor user
        $supervisor = new User();
        $supervisor->setFirstName($firstName);
        $supervisor->setLastName($lastName);
        $supervisor->setEmail($email);
        $supervisor->setRole('SUPERVISEUR');
        $supervisor->setAge(25); // Default
        $supervisor->setPassword($hasher->hashPassword($supervisor, $temporaryPassword));

        $em->persist($supervisor);
        $em->flush();

        // Send welcome email with credentials
        $loginUrl = $this->generateUrl('app_login', [], UrlGeneratorInterface::ABSOLUTE_URL);

        try {
            $mailer->sendSupervisorWelcomeEmail($supervisor, $temporaryPassword, $moduleName, $loginUrl);
            $this->addFlash('success', sprintf(
                'Supervisor "%s" created successfully! Login credentials sent to %s.',
                $supervisor->getFullName(),
                $email
            ));
        } catch (\Exception $e) {
            $this->addFlash('warning', sprintf(
                'Supervisor "%s" created, but email could not be sent. Temporary password: %s',
                $supervisor->getFullName(),
                $temporaryPassword
            ));
        }

        return $this->redirectToRoute('app_admin_dashboard');
    }

    // ─────────────────────────────────────────────
    //  CREATE USER / ADMIN ACCOUNT
    // ─────────────────────────────────────────────

    #[Route('/create-user', name: 'app_admin_create_user', methods: ['POST'])]
    public function createUser(
        Request                     $request,
        EntityManagerInterface      $em,
        UserPasswordHasherInterface $hasher
    ): Response {
        $firstName = trim((string) $request->request->get('first_name', ''));
        $lastName  = trim((string) $request->request->get('last_name', ''));
        $email     = trim((string) $request->request->get('email', ''));
        $password  = trim((string) $request->request->get('password', ''));
        $role      = strtoupper(trim((string) $request->request->get('role', 'USER')));
        $age       = (int) $request->request->get('age', 18);

        if ($firstName === '' || $lastName === '' || $email === '' || $password === '') {
            $this->addFlash('error', 'All fields are required.');
            return $this->redirectToRoute('app_admin_dashboard');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->addFlash('error', 'Invalid email address.');
            return $this->redirectToRoute('app_admin_dashboard');
        }

        if (strlen($password) < 6) {
            $this->addFlash('error', 'Password must be at least 6 characters.');
            return $this->redirectToRoute('app_admin_dashboard');
        }

        if (!in_array($role, ['USER', 'ADMIN'], true)) {
            $role = 'USER';
        }

        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            $this->addFlash('error', sprintf('A user with email "%s" already exists.', $email));
            return $this->redirectToRoute('app_admin_dashboard');
        }

        $user = new User();
        $user->setFirstName($firstName);
        $user->setLastName($lastName);
        $user->setEmail($email);
        $user->setRole($role);
        $user->setAge(max(5, min(100, $age)));
        $user->setPassword($hasher->hashPassword($user, $password));

        $em->persist($user);
        $em->flush();

        $this->addFlash('success', sprintf(
            '%s account "%s" created successfully!',
            ucfirst(strtolower($role)),
            $user->getFullName()
        ));

        return $this->redirectToRoute('app_admin_dashboard');
    }
}
