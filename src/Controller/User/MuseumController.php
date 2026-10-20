<?php

namespace App\Controller\User;

use App\Entity\MuseumPiece;
use App\Entity\MuseumSubmission;
use App\Repository\ActivityModuleRepository;
use App\Repository\MuseumPieceRepository;
use App\Repository\MuseumSubmissionRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/museum')]
class MuseumController extends AbstractController
{
    /** Public museum gallery — visible to EVERYONE (visitors + registered users) */
    #[Route('', name: 'app_museum_index')]
    public function index(
        MuseumSubmissionRepository $submissionRepo,
        \App\Repository\StoryRepository $storyRepo
    ): Response {
        $submissions = $submissionRepo->findBy(['status' => MuseumSubmission::STATUS_ACCEPTED], ['id' => 'DESC']);
        
        $enrichments = [];
        foreach ($submissions as $sub) {
            $data = [
                'content' => null,
                'image' => $sub->getImagePath(),
            ];
            
            // Fallback for missing demo images
            if (!$data['image']) {
                $data['image'] = sprintf('/uploads/museum/demo_%s_%d.png', $sub->getType(), $sub->getId());
            }

            if ($sub->getType() === 'story') {
                $story = null;
                if ($sub->getArtworkId()) {
                    $story = $storyRepo->find($sub->getArtworkId());
                }
                if (!$story && $sub->getTitle()) {
                    $story = $storyRepo->findOneBy(['title' => $sub->getTitle()]);
                }
                if ($story) {
                    $data['content'] = $story->getContent() ?? 'No story content available.';
                } else {
                    $data['content'] = 'This story is securely archived. Purchase to unlock full access and support the author.';
                }
            }
            $enrichments[$sub->getId()] = $data;
        }

        return $this->render('museum/index.html.twig', [
            'submissions' => $submissions,
            'enrichments' => $enrichments,
        ]);
    }

    /** Form to submit work to the museum from a specific module */
    #[Route('/submit', name: 'app_museum_submit', methods: ['GET', 'POST'])]
    #[IsGranted('ROLE_USER')]
    public function submit(
        Request $request,
        EntityManagerInterface $em,
        ActivityModuleRepository $moduleRepo,
        MuseumSubmissionRepository $submissionRepo,
        GamificationService $gamification,
        \App\Repository\DrawingRepository $drawingRepo,
        \App\Repository\PixelArtRepository $pixelArtRepo,
        \App\Repository\StoryRepository $storyRepo,
        \App\Repository\Shape3DRepository $shape3dRepo,
        \App\Repository\AcousticRecordingRepository $acousticRepo,
        \App\Service\ArtworkAnalysisService $artworkAnalysis
    ): Response {
        // Check if user already has a pending submission
        $hasPending = $submissionRepo->hasPendingForUser($this->getUser());

        // Pre-select module if passed via query string
        $moduleId     = (int) $request->query->get('module', 0);
        $activeModule = $moduleId ? $moduleRepo->find($moduleId) : null;
        $modules      = $moduleRepo->findAllActive();

        $savedWorks = [];
        $defaultType = 'artwork';

        // Fetch user's saved works based on the selected module
        if ($activeModule) {
            $user = $this->getUser();
            $modName = $activeModule->getName();

            if (str_contains($modName, 'Drawing')) {
                $works = $drawingRepo->findBy(['user' => $user]);
                foreach ($works as $w) {
                    $savedWorks[] = ['id' => $w->getId(), 'title' => $w->getTitle() ?? 'Untitled Drawing'];
                }
                $defaultType = 'drawing';
            } elseif (str_contains($modName, 'Pixel')) {
                $works = $pixelArtRepo->findAll();
                foreach ($works as $w) {
                    $savedWorks[] = ['id' => $w->getId(), 'title' => $w->getName() ?? 'Untitled Pixel Art', 'image' => $w->getImagePath()];
                }
                $defaultType = 'pixel_art';
            } elseif (str_contains($modName, 'Story')) {
                $works = $storyRepo->findAll();
                foreach ($works as $w) {
                    $savedWorks[] = ['id' => $w->getId(), 'title' => $w->getTitle() ?? 'Untitled Story', 'image' => $w->getCoverImage()];
                }
                $defaultType = 'story';
            } elseif (str_contains($modName, '3D')) {
                $works = $shape3dRepo->findAll();
                foreach ($works as $w) {
                    $savedWorks[] = ['id' => $w->getId(), 'title' => ($w->getShapeType() ?? 'Shape') . ' (' . $w->getColor() . ')', 'image' => $w->getImagePath()];
                }
                $defaultType = '3d_shape';
            } elseif (str_contains($modName, 'Music') || str_contains($modName, 'Acoustic')) {
                $works = $acousticRepo->findByUser($user);
                foreach ($works as $w) {
                    $savedWorks[] = ['id' => $w->getId(), 'title' => $w->getTitle() ?? 'Untitled Recording'];
                }
                $defaultType = 'music';
            }
        }

        if ($request->isMethod('POST')) {
            // Block submission if user has a pending one
            if ($hasPending) {
                $this->addFlash('warning', '⏳ You already have a pending submission. Please wait for your supervisor to review it before submitting again.');
                return $this->redirectToRoute('app_museum_my_submissions');
            }

            $submission = new MuseumSubmission();
            $submission->setStatus(MuseumSubmission::STATUS_PENDING);
            $submission->setUser($this->getUser());
            
            $type = $request->request->get('type', $defaultType);
            $submission->setType($type);

            // Set price from form
            $price = $request->request->get('price');
            if ($price !== null && $price !== '') {
                $submission->setPrice(number_format((float)$price, 2, '.', ''));
            }

            $savedWorkId = $request->request->get('saved_work_id');
            if ($savedWorkId) {
                // Assign from fetched properties
                $submission->setArtworkId((int)$savedWorkId);
                $selectedTitle = '';
                $selectedImage = null;
                foreach ($savedWorks as $sw) {
                    if ($sw['id'] == $savedWorkId) {
                        $selectedTitle = $sw['title'];
                        $selectedImage = $sw['image'] ?? null;
                        break;
                    }
                }
                $submission->setTitle($request->request->get('title') ?: $selectedTitle);
                $submission->setImagePath($selectedImage);
            } else {
                $submission->setTitle($request->request->get('title'));
            }

            // Link to module
            $selectedModuleId = (int) $request->request->get('module_id', 0);
            if ($selectedModuleId) {
                $module = $moduleRepo->find($selectedModuleId);
                $submission->setModule($module ?: null);
            }

            $file = $request->files->get('image');
            if ($file) {
                $filename = 'museum_' . uniqid() . '.' . $file->guessExtension();
                $dir      = $this->getParameter('kernel.project_dir') . '/public/uploads/museum';
                if (!is_dir($dir)) {
                    mkdir($dir, 0755, true);
                }
                $file->move($dir, $filename);
                $submission->setImagePath('/uploads/museum/' . $filename);
            }

            $em->persist($submission);
            $em->flush();

            // Award XP for museum submission
            $gamification->award($this->getUser(), GamificationService::SUBMIT_MUSEUM);

            // ── Auto-Approval with AI Analysis ──
            // All submissions with a cover image are auto-approved.
            // AI analysis provides a quality score for reference.
            $imagePath = $submission->getImagePath();
            if ($imagePath) {
                // Resolve to absolute filesystem path
                $absPath = $imagePath;
                if (!str_starts_with($imagePath, 'http')) {
                    $absPath = $this->getParameter('kernel.project_dir') . '/public' . $imagePath;
                }

                // Try AI analysis for quality scoring
                $aiResult = $artworkAnalysis->analyze($absPath);

                // Auto-approve all submissions with images
                $submission->setStatus(MuseumSubmission::STATUS_ACCEPTED);
                $submission->setAiAutoApproved(true);

                if ($aiResult['score'] > 0) {
                    $submission->setSupervisorNote(
                        '🤖 AI Approved (Score: ' . $aiResult['score'] . '/10): ' . $aiResult['reason']
                    );
                } else {
                    $submission->setSupervisorNote('🤖 Auto-approved — cover image uploaded by artist.');
                }
                $em->flush();

                // Award bonus XP
                $gamification->award($this->getUser(), GamificationService::MUSEUM_ACCEPTED);

                $this->addFlash('success', '🎉 Your artwork has been approved and is now live in the museum!' .
                    ($aiResult['score'] > 0 ? ' AI Score: ' . $aiResult['score'] . '/10' : ''));
            } else {
                $this->addFlash('warning', '⚠️ Please upload a cover image for your artwork.');
                return $this->redirectToRoute('app_museum_submit');
            }

            return $this->redirectToRoute('app_museum_my_submissions');
        }

        return $this->render('museum/submit.html.twig', [
            'modules'      => $modules,
            'activeModule' => $activeModule,
            'savedWorks'   => $savedWorks,
            'defaultType'  => $defaultType,
            'hasPending'   => $hasPending,
        ]);
    }

    /** User's own submission history */
    #[Route('/my-submissions', name: 'app_museum_my_submissions')]
    #[IsGranted('ROLE_USER')]
    public function mySubmissions(MuseumSubmissionRepository $repo): Response
    {
        return $this->render('museum/my_submissions.html.twig', [
            'submissions' => $repo->findByUser($this->getUser()),
        ]);
    }

    /** Public museum wall – only accepted works */
    #[Route('/submissions', name: 'app_museum_submissions')]
    public function submissions(MuseumSubmissionRepository $repo): Response
    {
        return $this->render('museum/submissions.html.twig', [
            'submissions' => $repo->findBy(['status' => MuseumSubmission::STATUS_ACCEPTED], ['id' => 'DESC']),
        ]);
    }
}
