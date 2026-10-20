<?php

namespace App\Repository;

use App\Entity\MuseumSubmission;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<MuseumSubmission> */
class MuseumSubmissionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, MuseumSubmission::class);
    }

    /** All pending submissions, newest first */
    public function findPending(): array
    {
        return $this->findBy(['status' => MuseumSubmission::STATUS_PENDING], ['id' => 'DESC']);
    }

    /** All submissions for a specific user, newest first */
    public function findByUser(User $user): array
    {
        return $this->findBy(['user' => $user], ['id' => 'DESC']);
    }

    /**
     * Latest submission per module for a given user.
     * Returns array keyed by module id => MuseumSubmission|null
     */
    public function findLatestByUserGroupedByModule(User $user): array
    {
        $results = $this->createQueryBuilder('ms')
            ->andWhere('ms.user = :user')
            ->setParameter('user', $user)
            ->orderBy('ms.id', 'DESC')
            ->getQuery()
            ->getResult();

        $map = [];
        foreach ($results as $submission) {
            $moduleId = $submission->getModule()?->getId();
            if ($moduleId !== null && !isset($map[$moduleId])) {
                $map[$moduleId] = $submission;
            }
        }
        return $map;
    }

    /** Count by status */
    public function countByStatus(string $status): int
    {
        return (int) $this->createQueryBuilder('ms')
            ->select('COUNT(ms.id)')
            ->andWhere('ms.status = :status')
            ->setParameter('status', $status)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** Count AI auto-approved submissions */
    public function countAiAutoApproved(): int
    {
        return (int) $this->createQueryBuilder('ms')
            ->select('COUNT(ms.id)')
            ->andWhere('ms.aiAutoApproved = :val')
            ->setParameter('val', true)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /** Check if a user has any pending (not yet reviewed) submission */
    public function hasPendingForUser(User $user): bool
    {
        return (int) $this->createQueryBuilder('ms')
            ->select('COUNT(ms.id)')
            ->andWhere('ms.user = :user')
            ->andWhere('ms.status = :status')
            ->setParameter('user', $user)
            ->setParameter('status', MuseumSubmission::STATUS_PENDING)
            ->getQuery()
            ->getSingleScalarResult() > 0;
    }
}
