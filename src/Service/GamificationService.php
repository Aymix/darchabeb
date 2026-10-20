<?php

namespace App\Service;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Gamification engine — awards XP, points, and auto-levels users.
 * Level formula: Level = 1 + floor(totalXP / 100)
 */
class GamificationService
{
    // XP thresholds — every 100 XP = 1 level
    private const XP_PER_LEVEL = 100;

    // ── Predefined award amounts ──
    public const CREATE_STORY      = ['xp' => 15, 'points' => 5];
    public const ADD_CHAPTER       = ['xp' => 10, 'points' => 3];
    public const ADD_SCENE         = ['xp' =>  8, 'points' => 2];
    public const SAVE_DRAWING      = ['xp' => 15, 'points' => 5];
    public const SAVE_PIXEL_ART    = ['xp' => 12, 'points' => 4];
    public const SAVE_3D_SCENE     = ['xp' => 15, 'points' => 5];
    public const SUBMIT_MUSEUM     = ['xp' => 20, 'points' => 8];
    public const MUSEUM_ACCEPTED   = ['xp' => 50, 'points' => 20];
    public const CREATE_POST       = ['xp' => 10, 'points' => 3];
    public const SAVE_MUSIC        = ['xp' => 12, 'points' => 4];
    public const EDIT_SCENE        = ['xp' =>  5, 'points' => 1];
    public const EDIT_CHAPTER      = ['xp' =>  5, 'points' => 1];

    public function __construct(
        private EntityManagerInterface $em
    ) {}

    /**
     * Award XP and points to a user, then recalculate their level.
     */
    public function award(User $user, array $amounts): void
    {
        $xp = $amounts['xp'] ?? 0;
        $points = $amounts['points'] ?? 0;

        $user->setXp($user->getXp() + $xp);
        $user->setPoints($user->getPoints() + $points);

        // Recalculate level
        $newLevel = 1 + intdiv($user->getXp(), self::XP_PER_LEVEL);
        $user->setLevel($newLevel);

        $this->em->flush();
    }

    /**
     * Award custom XP and points.
     */
    public function awardCustom(User $user, int $xp, int $points): void
    {
        $this->award($user, ['xp' => $xp, 'points' => $points]);
    }

    /**
     * Get XP progress towards next level (0–100).
     */
    public static function getXpProgress(User $user): int
    {
        return $user->getXp() % self::XP_PER_LEVEL;
    }

    /**
     * Get XP needed for next level.
     */
    public static function getXpToNextLevel(User $user): int
    {
        return self::XP_PER_LEVEL - self::getXpProgress($user);
    }
}
