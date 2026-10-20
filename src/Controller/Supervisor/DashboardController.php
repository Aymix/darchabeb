<?php

namespace App\Controller\Supervisor;

use App\Entity\MuseumSubmission;
use App\Repository\ActivityModuleRepository;
use App\Repository\MuseumSubmissionRepository;
use App\Repository\UserRepository;
use App\Service\GamificationService;
use App\Service\MailerService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/supervisor')]
class DashboardController extends AbstractController
{
    // ─────────────────────────────────────────────
    //  MAIN DASHBOARD
    // ─────────────────────────────────────────────

    #[Route('', name: 'app_supervisor_dashboard')]
    public function index(
        MuseumSubmissionRepository $submissionRepo,
        UserRepository             $userRepo,
        ActivityModuleRepository   $moduleRepo
    ): Response {
        return $this->render('supervisor/dashboard.html.twig', [
            'pendingSubmissions'  => $submissionRepo->findPending(),
            'allSubmissions'      => $submissionRepo->findBy([], ['id' => 'DESC']),
            'users'               => $userRepo->findBy([], ['id' => 'DESC']),
            'modules'             => $moduleRepo->findBy([], ['id' => 'DESC']),
            'pendingCount'        => $submissionRepo->countByStatus(MuseumSubmission::STATUS_PENDING),
            'acceptedCount'       => $submissionRepo->countByStatus(MuseumSubmission::STATUS_ACCEPTED),
            'refusedCount'        => $submissionRepo->countByStatus(MuseumSubmission::STATUS_REFUSED),
            'aiApprovedCount'     => $submissionRepo->countAiAutoApproved(),
        ]);
    }

    // ─────────────────────────────────────────────
    //  SUBMISSION REVIEW: ACCEPT
    // ─────────────────────────────────────────────

    #[Route('/submission/{id}/accept', name: 'app_supervisor_submission_accept', methods: ['POST'])]
    public function acceptSubmission(
        int                    $id,
        Request                $request,
        MuseumSubmissionRepository $repo,
        EntityManagerInterface $em,
        GamificationService    $gamification
    ): Response {
        $submission = $repo->find($id);
        if (!$submission) {
            $this->addFlash('error', 'Submission not found.');
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        $submission->setStatus(MuseumSubmission::STATUS_ACCEPTED);
        $note = trim((string) $request->request->get('supervisor_note', ''));
        $submission->setSupervisorNote($note ?: null);
        $em->flush();

        // Award bonus XP to the submitter
        $submitter = $submission->getUser();
        if ($submitter) {
            $gamification->award($submitter, GamificationService::MUSEUM_ACCEPTED);
        }

        $this->addFlash('success', sprintf('"%s" has been accepted and added to the museum!', $submission->getTitle()));
        return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'submissions']);
    }

    // ─────────────────────────────────────────────
    //  SUBMISSION REVIEW: REFUSE
    // ─────────────────────────────────────────────

    #[Route('/submission/{id}/refuse', name: 'app_supervisor_submission_refuse', methods: ['POST'])]
    public function refuseSubmission(
        int                    $id,
        Request                $request,
        MuseumSubmissionRepository $repo,
        EntityManagerInterface $em
    ): Response {
        $submission = $repo->find($id);
        if (!$submission) {
            $this->addFlash('error', 'Submission not found.');
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        $submission->setStatus(MuseumSubmission::STATUS_REFUSED);
        $note = trim((string) $request->request->get('supervisor_note', ''));
        $submission->setSupervisorNote($note ?: null);
        $em->flush();

        $this->addFlash('warning', sprintf('"%s" has been refused.', $submission->getTitle()));
        return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'submissions']);
    }

    // ─────────────────────────────────────────────
    //  USER MANAGEMENT: BLOCK / UNBLOCK + EMAIL
    // ─────────────────────────────────────────────

    #[Route('/user/{id}/toggle-block', name: 'app_supervisor_user_toggle_block', methods: ['POST'])]
    public function toggleBlockUser(
        int                    $id,
        Request                $request,
        UserRepository         $repo,
        EntityManagerInterface $em,
        MailerService          $mailer
    ): Response {
        $user = $repo->find($id);
        if (!$user) {
            $this->addFlash('error', 'User not found.');
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        // Prevent blocking another supervisor or admin
        if (in_array('ROLE_SUPERVISOR', $user->getRoles(), true) ||
            in_array('ROLE_ADMIN',      $user->getRoles(), true)) {
            $this->addFlash('error', 'You cannot block supervisors or admins.');
            return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'users']);
        }

        if (!$user->isBlocked()) {
            // BLOCKING — reason is required
            $reason = trim((string) $request->request->get('block_reason', ''));
            if ($reason === '') {
                $this->addFlash('error', 'You must provide a reason to block this user.');
                return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'users']);
            }
            $user->setBlocked(true);
            $user->setBlockReason($reason);
            $em->flush();

            // Send block notification email
            try {
                $supervisorName = $this->getUser()->getFullName();
                $mailer->sendBlockNotification($user, $reason, $supervisorName);
            } catch (\Exception $e) {
                // Log error but don't break the flow
            }

            $this->addFlash('success', sprintf('User "%s" has been blocked and notified by email. Reason: %s', $user->getFullName(), $reason));
        } else {
            // UNBLOCKING
            $user->setBlocked(false);
            $user->setBlockReason(null);
            $em->flush();
            $this->addFlash('success', sprintf('User "%s" has been unblocked.', $user->getFullName()));
        }

        return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'users']);
    }

    // ─────────────────────────────────────────────
    //  MODULE MANAGEMENT: BLOCK / ACTIVATE
    // ─────────────────────────────────────────────

    #[Route('/module/{id}/toggle-block', name: 'app_supervisor_module_toggle_block', methods: ['POST'])]
    public function toggleBlockModule(
        int                      $id,
        ActivityModuleRepository $repo,
        EntityManagerInterface   $em
    ): Response {
        $module = $repo->find($id);
        if (!$module) {
            $this->addFlash('error', 'Module not found.');
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        $newStatus = $module->isActive() ? 'BLOCKED' : 'ACTIVE';
        $module->setStatus($newStatus);
        $em->flush();

        $action = $newStatus === 'BLOCKED' ? '🔒 blocked' : '✅ activated';
        $this->addFlash('success', sprintf('Module "%s" has been %s.', $module->getName(), $action));
        return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'modules']);
    }

    // ─────────────────────────────────────────────
    //  WORKSHOP SCHEDULE: Update day/time
    // ─────────────────────────────────────────────

    #[Route('/module/{id}/workshop', name: 'app_supervisor_module_workshop', methods: ['POST'])]
    public function updateWorkshop(
        int                      $id,
        Request                  $request,
        ActivityModuleRepository $repo,
        EntityManagerInterface   $em
    ): Response {
        $module = $repo->find($id);
        if (!$module) {
            $this->addFlash('error', 'Module not found.');
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        $day  = $request->request->get('workshop_day');
        $time = $request->request->get('workshop_time');
        $desc = trim((string) $request->request->get('workshop_description', ''));

        $module->setWorkshopDay($day ?: null);
        $module->setWorkshopTime($time ?: null);
        $module->setWorkshopDescription($desc ?: null);
        $em->flush();

        $this->addFlash('success', sprintf('📅 Workshop schedule updated for "%s".', $module->getName()));
        return $this->redirectToRoute('app_supervisor_dashboard', ['#' => 'modules']);
    }
}
