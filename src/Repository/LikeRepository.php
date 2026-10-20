<?php

namespace App\Repository;

use App\Entity\Like;
use App\Entity\Post;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Like>
 */
class LikeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Like::class);
    }

    public function findByPostAndUser(Post $post, User $user): ?Like
    {
        return $this->findOneBy(['post' => $post, 'user' => $user]);
    }

    public function toggleLike(Post $post, User $user): bool
    {
        $existing = $this->findByPostAndUser($post, $user);
        $em = $this->getEntityManager();

        if ($existing) {
            $em->remove($existing);
            $em->flush();
            return false; // unliked
        }

        $like = new Like();
        $like->setPost($post);
        $like->setUser($user);
        $em->persist($like);
        $em->flush();
        return true; // liked
    }
}
