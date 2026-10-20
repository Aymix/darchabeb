<?php

namespace App\Controller\User;

use App\Entity\Drawing;
use App\Repository\DrawingRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/drawing')]
#[IsGranted('ROLE_USER')]
class DrawingController extends AbstractController
{
    #[Route('', name: 'app_drawing_studio')]
    public function studio(): Response
    {
        return $this->render('drawing/studio.html.twig');
    }

    #[Route('/gallery', name: 'app_drawing_gallery')]
    public function gallery(DrawingRepository $repo): Response
    {
        $drawings = $repo->findBy(
            ['user' => $this->getUser()],
            ['createdAt' => 'DESC']
        );
        $allDrawings = $repo->findBy(
            ['published' => true],
            ['createdAt' => 'DESC'],
            50
        );
        return $this->render('drawing/gallery.html.twig', [
            'myDrawings' => $drawings,
            'allDrawings' => $allDrawings,
        ]);
    }

    #[Route('/save', name: 'app_drawing_save', methods: ['POST'])]
    public function save(Request $request, EntityManagerInterface $em, GamificationService $gamification): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $title = $data['title'] ?? 'Untitled Drawing';
        $imageData = $data['image'] ?? null;
        $description = $data['description'] ?? '';

        if (!$imageData) {
            return $this->json(['error' => 'No image data'], 400);
        }

        // Save image file
        $filename = 'drawing_' . uniqid() . '.png';
        $dir = $this->getParameter('kernel.project_dir') . '/public/uploads/drawings';
        if (!is_dir($dir)) { mkdir($dir, 0755, true); }

        $imgData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $imageData));
        file_put_contents($dir . '/' . $filename, $imgData);

        $drawing = new Drawing();
        $drawing->setTitle($title);
        $drawing->setDescription($description);
        $drawing->setUser($this->getUser());
        $drawing->setPublished(true);
        $drawing->setCreatedAt(new \DateTime());

        $em->persist($drawing);
        $em->flush();

        // Award XP for saving a drawing
        $gamification->award($this->getUser(), GamificationService::SAVE_DRAWING);

        return $this->json(['success' => true, 'id' => $drawing->getId(), 'filename' => $filename]);
    }

    #[Route('/delete/{id}', name: 'app_drawing_delete', methods: ['POST'])]
    public function delete(Drawing $drawing, EntityManagerInterface $em): Response
    {
        if ($drawing->getUser() !== $this->getUser()) {
            throw $this->createAccessDeniedException();
        }
        $em->remove($drawing);
        $em->flush();
        $this->addFlash('success', 'Drawing deleted.');
        return $this->redirectToRoute('app_drawing_gallery');
    }
}
