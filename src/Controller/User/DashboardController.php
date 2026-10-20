<?php

namespace App\Controller\User;

use App\Repository\ActivityModuleRepository;
use App\Repository\MuseumSubmissionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/dashboard')]
#[IsGranted('ROLE_USER')]
class DashboardController extends AbstractController
{
    #[Route('', name: 'app_user_dashboard')]
    public function index(
        ActivityModuleRepository   $moduleRepository,
        MuseumSubmissionRepository $submissionRepository
    ): Response {
        // Redirect admins and supervisors to their own dashboards
        if ($this->isGranted('ROLE_ADMIN')) {
            return $this->redirectToRoute('app_admin_dashboard');
        }
        if ($this->isGranted('ROLE_SUPERVISOR')) {
            return $this->redirectToRoute('app_supervisor_dashboard');
        }

        $modules = $moduleRepository->findAllActive();

        // Map of module_id => latest MuseumSubmission for the current user
        $submissionMap = $submissionRepository->findLatestByUserGroupedByModule($this->getUser());

        return $this->render('user/dashboard.html.twig', [
            'modules'       => $modules,
            'submissionMap' => $submissionMap,
        ]);
    }
}
