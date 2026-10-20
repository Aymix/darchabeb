<?php

namespace App\Controller\User;

use App\Entity\Post;
use App\Entity\Comment;
use App\Entity\Like;
use App\Repository\PostRepository;
use App\Repository\LikeRepository;
use App\Service\GamificationService;
use Doctrine\ORM\EntityManagerInterface;
use Knp\Component\Pager\PaginatorInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/feed')]
#[IsGranted('ROLE_USER')]
class FeedController extends AbstractController
{
    #[Route('', name: 'app_feed_index')]
    public function index(Request $request, PostRepository $repo, PaginatorInterface $paginator): Response
    {
        $query = $repo->createQueryBuilder('p')
            ->orderBy('p.id', 'DESC')
            ->getQuery();

        $pagination = $paginator->paginate(
            $query,
            $request->query->getInt('page', 1),
            10 // posts per page
        );

        return $this->render('feed/index.html.twig', [
            'pagination' => $pagination,
        ]);
    }

    #[Route('/new', name: 'app_feed_new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $em, GamificationService $gamification, LoggerInterface $logger): Response
    {
        if ($request->isMethod('POST')) {
            $post = new Post();
            $post->setAuthor($this->getUser());
            $post->setDescription($request->request->get('description'));

            $file = $request->files->get('image');
            if ($file) {
                $filename = 'post_' . uniqid() . '.' . $file->guessExtension();
                $dir = $this->getParameter('kernel.project_dir') . '/public/uploads/posts';
                if (!is_dir($dir)) { mkdir($dir, 0755, true); }
                $file->move($dir, $filename);
                $post->setImagePath('/uploads/posts/' . $filename);
            }

            // Save GIF URL from Giphy picker
            $gifUrl = $request->request->get('gif_url');
            if ($gifUrl) {
                $post->setGifUrl($gifUrl);
            }

            $em->persist($post);
            $em->flush();

            // Monolog: log the new post creation
            $logger->info('New post created', [
                'post_id' => $post->getId(),
                'user' => $this->getUser()->getUserIdentifier(),
                'has_image' => (bool) $post->getImagePath(),
                'has_gif' => (bool) $post->getGifUrl(),
            ]);

            // Award XP for creating a post
            $gamification->award($this->getUser(), GamificationService::CREATE_POST);

            $this->addFlash('success', 'Post published!');
            return $this->redirectToRoute('app_feed_index');
        }
        return $this->render('feed/new.html.twig');
    }

    #[Route('/{id}/like', name: 'app_feed_like', methods: ['POST'])]
    public function like(Post $post, EntityManagerInterface $em, LikeRepository $likeRepo): JsonResponse
    {
        $user = $this->getUser();
        $existing = $likeRepo->findOneBy(['post' => $post, 'user' => $user]);

        if ($existing) {
            $em->remove($existing);
            $em->flush();
            return $this->json(['liked' => false, 'count' => $post->getLikeCount() - 1]);
        }

        $like = new Like();
        $like->setPost($post);
        $like->setUser($user);
        $em->persist($like);
        $em->flush();

        return $this->json(['liked' => true, 'count' => $post->getLikeCount()]);
    }

    #[Route('/{id}/comment', name: 'app_feed_comment', methods: ['POST'])]
    public function comment(Post $post, Request $request, EntityManagerInterface $em): Response
    {
        $content = $request->request->get('content');
        if ($content) {
            $comment = new Comment();
            $comment->setContent($content);
            $comment->setPost($post);
            $comment->setUser($this->getUser());
            $comment->setCreatedAt(new \DateTime());
            $em->persist($comment);
            $em->flush();
        }
        return $this->redirectToRoute('app_feed_index');
    }

    #[Route('/{id}/delete', name: 'app_feed_delete', methods: ['POST'])]
    public function delete(Post $post, EntityManagerInterface $em): Response
    {
        if ($post->getAuthor() !== $this->getUser()) {
            throw $this->createAccessDeniedException();
        }
        $em->remove($post);
        $em->flush();
        $this->addFlash('success', 'Post deleted.');
        return $this->redirectToRoute('app_feed_index');
    }
}
