<?php

namespace App\Repository;

use App\Entity\ActivityModule;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ActivityModule>
 */
class ActivityModuleRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ActivityModule::class);
    }

    /** @return ActivityModule[] */
    public function findAllActive(): array
    {
        return $this->findBy(['status' => 'ACTIVE']);
    }
}
