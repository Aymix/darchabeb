<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    /** @return User[] */
    public function findTopByPoints(int $limit = 10): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.role = :role')
            ->setParameter('role', 'USER')
            ->orderBy('u.points', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** @return array<string, int> */
    public function countByRole(): array
    {
        $results = $this->createQueryBuilder('u')
            ->select('u.role, COUNT(u.id) as cnt')
            ->groupBy('u.role')
            ->getQuery()
            ->getResult();

        $stats = [];
        foreach ($results as $row) {
            $stats[$row['role']] = (int) $row['cnt'];
        }
        return $stats;
    }

    /** @return array<string, int> */
    public function getAgeDistribution(): array
    {
        $conn = $this->getEntityManager()->getConnection();
        $sql = "SELECT CASE
                    WHEN age < 18 THEN 'Under 18'
                    WHEN age BETWEEN 18 AND 25 THEN '18-25'
                    WHEN age BETWEEN 26 AND 35 THEN '26-35'
                    ELSE '35+'
                END AS ageGroup, COUNT(*) as cnt
                FROM user GROUP BY ageGroup";
        $result = $conn->executeQuery($sql)->fetchAllAssociative();

        $dist = [];
        foreach ($result as $row) {
            $dist[$row['ageGroup']] = (int) $row['cnt'];
        }
        return $dist;
    }

    /** @return User[] */
    public function searchByNameOrEmail(string $query): array
    {
        return $this->createQueryBuilder('u')
            ->where('u.firstName LIKE :q OR u.lastName LIKE :q OR u.email LIKE :q')
            ->setParameter('q', '%' . $query . '%')
            ->orderBy('u.id', 'DESC')
            ->getQuery()
            ->getResult();
    }

    public function findAllSupervisorNames(): array
    {
        return $this->createQueryBuilder('u')
            ->select("CONCAT(u.firstName, ' ', u.lastName) as fullName")
            ->andWhere('u.role = :role')
            ->setParameter('role', 'SUPERVISEUR')
            ->getQuery()
            ->getSingleColumnResult();
    }
}
