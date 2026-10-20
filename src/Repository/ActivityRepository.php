<?php

namespace App\Repository;

use App\Entity\Activity;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Activity>
 */
class ActivityRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Activity::class);
    }

    /** @return array<string, Activity[]> Activities grouped by day */
    public function findGroupedByDay(): array
    {
        $activities = $this->findAll();
        $grouped = [];
        foreach ($activities as $activity) {
            $day = $activity->getDay() ?? 'Unassigned';
            $grouped[$day][] = $activity;
        }
        return $grouped;
    }

    /** @return Activity[] */
    public function findByDay(string $day): array
    {
        return $this->findBy(['day' => $day]);
    }
}
