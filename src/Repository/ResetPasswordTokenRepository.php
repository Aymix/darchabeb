<?php

namespace App\Repository;

use App\Entity\ResetPasswordToken;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ResetPasswordTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ResetPasswordToken::class);
    }

    public function findValidToken(string $token): ?ResetPasswordToken
    {
        $resetToken = $this->findOneBy(['token' => $token]);

        if (!$resetToken || !$resetToken->isValid()) {
            return null;
        }

        return $resetToken;
    }

    /** Invalidate all existing tokens for a user */
    public function invalidateTokensForUser(User $user): void
    {
        $this->createQueryBuilder('t')
            ->update()
            ->set('t.used', ':used')
            ->where('t.user = :user')
            ->andWhere('t.used = false')
            ->setParameter('used', true)
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }
}
