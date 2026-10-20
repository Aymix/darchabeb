<?php

namespace App\Controller\User;

use App\Entity\PixelArt;
use App\Repository\PixelArtRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/pixelart')]
#[IsGranted('ROLE_USER')]
class PixelArtController extends AbstractController
{
    #[Route('', name: 'app_pixelart_editor')]
    public function editor(): Response
    {
        return $this->render('pixelart/editor.html.twig');
    }

    #[Route('/gallery', name: 'app_pixelart_gallery')]
    public function gallery(PixelArtRepository $repo): Response
    {
        return $this->render('pixelart/gallery.html.twig', [
            'artworks' => $repo->findBy([], ['id' => 'DESC']),
        ]);
    }

    #[Route('/save', name: 'app_pixelart_save', methods: ['POST'])]
    public function save(Request $request, EntityManagerInterface $em, GamificationService $gamification): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        $name = $data['name'] ?? 'Untitled';
        $imageData = $data['image'] ?? null;

        if (!$imageData) {
            return $this->json(['error' => 'No image data'], 400);
        }

        $filename = 'pixel_' . uniqid() . '.png';
        $dir = $this->getParameter('kernel.project_dir') . '/public/uploads/pixelart';
        if (!is_dir($dir)) { mkdir($dir, 0755, true); }

        $imgData = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $imageData));
        file_put_contents($dir . '/' . $filename, $imgData);

        $art = new PixelArt();
        $art->setName($name);
        $art->setImagePath('/uploads/pixelart/' . $filename);
        $em->persist($art);
        $em->flush();

        // Award XP for saving pixel art
        $gamification->award($this->getUser(), GamificationService::SAVE_PIXEL_ART);

        return $this->json(['success' => true, 'id' => $art->getId()]);
    }
}
