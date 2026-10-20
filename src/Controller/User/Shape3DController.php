<?php

namespace App\Controller\User;

use App\Entity\Shape3D;
use App\Repository\Shape3DRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/shapes3d')]
#[IsGranted('ROLE_USER')]
class Shape3DController extends AbstractController
{
    #[Route('', name: 'app_shapes3d_builder')]
    public function builder(): Response
    {
        return $this->render('shapes3d/builder.html.twig');
    }

    #[Route('/edit/{id}', name: 'app_shapes3d_edit')]
    public function edit(Shape3D $shape): Response
    {
        return $this->render('shapes3d/builder.html.twig', [
            'sceneData' => $shape->getSceneData() ?? '',
        ]);
    }

    #[Route('/gallery', name: 'app_shapes3d_gallery')]
    public function gallery(Shape3DRepository $repo): Response
    {
        return $this->render('shapes3d/gallery.html.twig', [
            'shapes' => $repo->findBy([], ['id' => 'DESC']),
        ]);
    }

    #[Route('/save', name: 'app_shapes3d_save', methods: ['POST'])]
    public function save(Request $request, EntityManagerInterface $em, GamificationService $gamification): JsonResponse
    {
        $data = json_decode($request->getContent(), true);
        if (!$data) {
            return $this->json(['success' => false, 'error' => 'Invalid data']);
        }

        $shape = new Shape3D();
        $shape->setTitle($data['title'] ?? 'Untitled');
        $shape->setShapeType($data['shapeType'] ?? 'scene');
        $shape->setColor($data['color'] ?? '#f97316');
        $shape->setTexture($data['texture'] ?? 'solid');
        $shape->setSize($data['size'] ?? 100);
        $shape->setSceneData($data['sceneData'] ?? null);
        $shape->setUser($this->getUser());

        // Save screenshot image
        $screenshot = $data['screenshot'] ?? null;
        if ($screenshot && str_starts_with($screenshot, 'data:image/')) {
            $uploadsDir = $this->getParameter('kernel.project_dir') . '/public/uploads/shapes3d';
            if (!is_dir($uploadsDir)) {
                mkdir($uploadsDir, 0777, true);
            }

            $filename = 'shape_' . uniqid() . '.png';
            $imageData = explode(',', $screenshot, 2);
            if (count($imageData) === 2) {
                $decoded = base64_decode($imageData[1]);
                if ($decoded !== false) {
                    file_put_contents($uploadsDir . '/' . $filename, $decoded);
                    $shape->setImagePath('/uploads/shapes3d/' . $filename);
                }
            }
        }

        $em->persist($shape);
        $em->flush();

        // Award XP for saving 3D scene
        $gamification->award($this->getUser(), GamificationService::SAVE_3D_SCENE);

        return $this->json(['success' => true, 'id' => $shape->getId()]);
    }
}
