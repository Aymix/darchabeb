<?php

namespace App\Controller\User;

use App\Entity\Story;
use App\Entity\Genre;
use App\Entity\Chapter;
use App\Entity\Scene;
use App\Repository\GenreRepository;
use App\Repository\StoryRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Dompdf\Dompdf;
use Dompdf\Options;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/story')]
#[IsGranted('ROLE_USER')]
class StoryController extends AbstractController
{
    #[Route('', name: 'app_story_index')]
    public function index(StoryRepository $repo): Response
    {
        return $this->render('story/index.html.twig', [
            'stories' => $repo->findBy([], ['id' => 'DESC']),
        ]);
    }

    #[Route('/new', name: 'app_story_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $em, GenreRepository $genreRepo, GamificationService $gamification): Response
    {
        if ($request->isMethod('POST')) {
            $story = new Story();
            $story->setTitle($request->request->get('title'));
            $story->setStatus('DRAFT');
            $story->setContent($request->request->get('content', ''));

            // Handle multiple genres
            $genreIds = $request->request->all('genres');
            if (!empty($genreIds)) {
                foreach ($genreIds as $gid) {
                    $genre = $genreRepo->find($gid);
                    if ($genre) {
                        $story->addGenre($genre);
                    }
                }
                // Also set the legacy genre field to the first genre name
                $firstGenre = $story->getGenres()->first();
                $story->setGenre($firstGenre ? $firstGenre->getName() : null);
            } else {
                $story->setGenre($request->request->get('genre'));
            }

            $em->persist($story);
            $em->flush();

            // Award XP for creating a story
            $gamification->award($this->getUser(), GamificationService::CREATE_STORY);

            $this->addFlash('success', 'Story created!');
            return $this->redirectToRoute('app_story_show', ['id' => $story->getId()]);
        }

        return $this->render('story/new.html.twig', [
            'genres' => $genreRepo->findAllOrdered(),
        ]);
    }

    #[Route('/{id}', name: 'app_story_show', requirements: ['id' => '\d+'])]
    public function show(Story $story): Response
    {
        return $this->render('story/show.html.twig', ['story' => $story]);
    }

    #[Route('/{id}/edit', name: 'app_story_edit', methods: ['GET', 'POST'])]
    public function edit(Story $story, Request $request, EntityManagerInterface $em, GenreRepository $genreRepo): Response
    {
        if ($request->isMethod('POST')) {
            $story->setTitle($request->request->get('title'));
            $story->setContent($request->request->get('content', ''));

            // Clear existing genres and re-assign
            foreach ($story->getGenres()->toArray() as $g) {
                $story->removeGenre($g);
            }

            $genreIds = $request->request->all('genres');
            if (!empty($genreIds)) {
                foreach ($genreIds as $gid) {
                    $genre = $genreRepo->find($gid);
                    if ($genre) {
                        $story->addGenre($genre);
                    }
                }
                $firstGenre = $story->getGenres()->first();
                $story->setGenre($firstGenre ? $firstGenre->getName() : null);
            } else {
                $story->setGenre($request->request->get('genre'));
            }

            $em->flush();
            $this->addFlash('success', 'Story updated!');
            return $this->redirectToRoute('app_story_show', ['id' => $story->getId()]);
        }

        return $this->render('story/edit.html.twig', [
            'story' => $story,
            'genres' => $genreRepo->findAllOrdered(),
        ]);
    }

    // ── CHAPTER: Edit ──
    #[Route('/chapter/{id}/edit', name: 'app_chapter_edit', methods: ['POST'])]
    public function editChapter(Chapter $chapter, Request $request, EntityManagerInterface $em, GamificationService $gamification): Response
    {
        $chapter->setTitle($request->request->get('title'));
        $em->flush();
        $gamification->award($this->getUser(), GamificationService::EDIT_CHAPTER);
        $this->addFlash('success', 'Chapter updated!');
        return $this->redirectToRoute('app_story_show', ['id' => $chapter->getStory()->getId()]);
    }

    // ── CHAPTER: Delete ──
    #[Route('/chapter/{id}/delete', name: 'app_chapter_delete', methods: ['POST'])]
    public function deleteChapter(Chapter $chapter, EntityManagerInterface $em): Response
    {
        $storyId = $chapter->getStory()->getId();
        $em->remove($chapter);
        $em->flush();
        $this->addFlash('success', 'Chapter deleted.');
        return $this->redirectToRoute('app_story_show', ['id' => $storyId]);
    }

    #[Route('/{id}/chapter/new', name: 'app_chapter_new', methods: ['POST'])]
    public function newChapter(Story $story, Request $request, EntityManagerInterface $em, GamificationService $gamification): Response
    {
        $chapter = new Chapter();
        $chapter->setTitle($request->request->get('title', 'New Chapter'));
        $chapter->setStory($story);
        $chapter->setOrderIndex($story->getChapters()->count() + 1);
        $em->persist($chapter);
        $em->flush();
        $gamification->award($this->getUser(), GamificationService::ADD_CHAPTER);
        $this->addFlash('success', 'Chapter added!');
        return $this->redirectToRoute('app_story_show', ['id' => $story->getId()]);
    }

    #[Route('/chapter/{id}/scene/new', name: 'app_scene_new', methods: ['POST'])]
    public function newScene(Chapter $chapter, Request $request, EntityManagerInterface $em, GamificationService $gamification): Response
    {
        $scene = new Scene();
        $scene->setTitle($request->request->get('title', 'New Scene'));
        $scene->setContent($request->request->get('content', ''));
        $scene->setStatus('DRAFT');
        $scene->setChapter($chapter);
        $em->persist($scene);
        $em->flush();
        $gamification->award($this->getUser(), GamificationService::ADD_SCENE);
        $this->addFlash('success', 'Scene added!');
        return $this->redirectToRoute('app_story_show', ['id' => $chapter->getStory()->getId()]);
    }

    // ── SCENE: Edit ──
    #[Route('/scene/{id}/edit', name: 'app_scene_edit', methods: ['POST'])]
    public function editScene(Scene $scene, Request $request, EntityManagerInterface $em, GamificationService $gamification): Response
    {
        $scene->setTitle($request->request->get('title'));
        $scene->setContent($request->request->get('content'));
        $em->flush();
        $gamification->award($this->getUser(), GamificationService::EDIT_SCENE);
        $this->addFlash('success', 'Scene updated!');
        return $this->redirectToRoute('app_story_show', ['id' => $scene->getChapter()->getStory()->getId()]);
    }

    // ── SCENE: Delete ──
    #[Route('/scene/{id}/delete', name: 'app_scene_delete', methods: ['POST'])]
    public function deleteScene(Scene $scene, EntityManagerInterface $em): Response
    {
        $storyId = $scene->getChapter()->getStory()->getId();
        $em->remove($scene);
        $em->flush();
        $this->addFlash('success', 'Scene deleted.');
        return $this->redirectToRoute('app_story_show', ['id' => $storyId]);
    }

    #[Route('/{id}/delete', name: 'app_story_delete', methods: ['POST'])]
    public function delete(Story $story, EntityManagerInterface $em): Response
    {
        $em->remove($story);
        $em->flush();
        $this->addFlash('success', 'Story deleted.');
        return $this->redirectToRoute('app_story_index');
    }

    // ── EXPORT: PDF ──
    #[Route('/{id}/export-pdf', name: 'app_story_export_pdf', requirements: ['id' => '\d+'])]
    public function exportPdf(Story $story): Response
    {
        $html = $this->renderView('story/pdf.html.twig', ['story' => $story]);

        $options = new Options();
        $options->set('isRemoteEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $story->getTitle()) . '.pdf';

        return new Response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    // ── EXPORT: JSON (download) ──
    #[Route('/{id}/export-json', name: 'app_story_export_json', requirements: ['id' => '\d+'])]
    public function exportJson(Story $story): JsonResponse
    {
        $data = [
            'title' => $story->getTitle(),
            'genre' => $story->getGenre(),
            'genre_names' => $story->getGenreNames(),
            'status' => $story->getStatus(),
            'content' => $story->getContent(),
            'chapters' => [],
        ];

        foreach ($story->getChapters() as $chapter) {
            $chapterData = [
                'title' => $chapter->getTitle(),
                'order_index' => $chapter->getOrderIndex(),
                'scenes' => [],
            ];
            foreach ($chapter->getScenes() as $scene) {
                $chapterData['scenes'][] = [
                    'title' => $scene->getTitle(),
                    'content' => $scene->getContent(),
                    'status' => $scene->getStatus(),
                    'order_index' => $scene->getOrderIndex(),
                ];
            }
            $data['chapters'][] = $chapterData;
        }

        $response = new JsonResponse($data);
        $filename = preg_replace('/[^a-zA-Z0-9_-]/', '_', $story->getTitle()) . '.json';
        $response->headers->set('Content-Disposition', 'attachment; filename="' . $filename . '"');
        return $response;
    }

    // ── IMPORT: Story from JSON ──
    #[Route('/import', name: 'app_story_import', methods: ['POST'])]
    public function importStory(Request $request, EntityManagerInterface $em): Response
    {
        $file = $request->files->get('story_file');
        if (!$file) {
            $this->addFlash('error', 'No file was uploaded.');
            return $this->redirectToRoute('app_story_index');
        }

        try {
            $content = file_get_contents($file->getPathname());
            $data = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            $this->addFlash('error', 'Invalid JSON file: ' . $e->getMessage());
            return $this->redirectToRoute('app_story_index');
        }

        $story = new Story();
        $story->setTitle($data['title'] ?? 'Imported Story');
        $story->setStatus($data['status'] ?? 'DRAFT');
        $story->setContent($data['content'] ?? '');
        $story->setGenre($data['genre'] ?? null);

        if (isset($data['chapters']) && is_array($data['chapters'])) {
            foreach ($data['chapters'] as $ci => $chapterData) {
                $chapter = new Chapter();
                $chapter->setTitle($chapterData['title'] ?? 'Chapter ' . ($ci + 1));
                $chapter->setOrderIndex($chapterData['order_index'] ?? ($ci + 1));
                $chapter->setStory($story);

                if (isset($chapterData['scenes']) && is_array($chapterData['scenes'])) {
                    foreach ($chapterData['scenes'] as $si => $sceneData) {
                        $scene = new Scene();
                        $scene->setTitle($sceneData['title'] ?? 'Scene ' . ($si + 1));
                        $scene->setContent($sceneData['content'] ?? '');
                        $scene->setStatus($sceneData['status'] ?? 'DRAFT');
                        $scene->setOrderIndex($sceneData['order_index'] ?? ($si + 1));
                        $scene->setChapter($chapter);
                        $em->persist($scene);
                    }
                }

                $em->persist($chapter);
            }
        }

        $em->persist($story);
        $em->flush();

        $this->addFlash('success', 'Story "' . $story->getTitle() . '" imported successfully!');
        return $this->redirectToRoute('app_story_show', ['id' => $story->getId()]);
    }

    // ── AJAX: Add a new custom genre ──
    #[Route('/genre/add', name: 'app_genre_add', methods: ['POST'])]
    public function addGenre(Request $request, EntityManagerInterface $em, GenreRepository $genreRepo): JsonResponse
    {
        $name = trim((string) $request->request->get('name', ''));
        if ($name === '') {
            return $this->json(['error' => 'Genre name is required.'], 400);
        }

        // Check if it already exists
        $existing = $genreRepo->findOneBy(['name' => $name]);
        if ($existing) {
            return $this->json(['id' => $existing->getId(), 'name' => $existing->getName()]);
        }

        $genre = new Genre();
        $genre->setName($name);
        $em->persist($genre);
        $em->flush();

        return $this->json(['id' => $genre->getId(), 'name' => $genre->getName()], 201);
    }
}
