<?php

namespace App\Repository;

use App\Entity\AcousticTrack;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<AcousticTrack> */
class AcousticTrackRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AcousticTrack::class);
    }

    public function findPublic(array $filters = []): array
    {
        $qb = $this->createQueryBuilder('t')
            ->andWhere('t.isPublic = true')
            ->orderBy('t.createdAt', 'DESC');

        if (!empty($filters['title'])) {
            $qb->andWhere('t.title LIKE :title')
               ->setParameter('title', '%' . $filters['title'] . '%');
        }
        if (!empty($filters['genre'])) {
            $qb->andWhere('t.genre LIKE :genre')
               ->setParameter('genre', '%' . $filters['genre'] . '%');
        }
        if (!empty($filters['minBpm'])) {
            $qb->andWhere('t.bpm >= :minBpm')
               ->setParameter('minBpm', (int) $filters['minBpm']);
        }
        if (!empty($filters['maxBpm'])) {
            $qb->andWhere('t.bpm <= :maxBpm')
               ->setParameter('maxBpm', (int) $filters['maxBpm']);
        }
        return $qb->getQuery()->getResult();
    }

    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['createdAt' => 'DESC']);
    }
}
