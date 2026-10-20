<?php

namespace App\Entity;

use App\Repository\ResetPasswordTokenRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ResetPasswordTokenRepository::class)]
#[ORM\Table(name: 'reset_password_token')]
class ResetPasswordToken
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(length: 100, unique: true)]
    private ?string $token = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $expiresAt = null;

    #[ORM\Column]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $used = false;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public static function create(User $user, int $lifetimeMinutes = 60): self
    {
        $token = new self();
        $token->user = $user;
        $token->token = bin2hex(random_bytes(32)); // 64-char secure token
        $token->expiresAt = new \DateTimeImmutable("+{$lifetimeMinutes} minutes");
        return $token;
    }

    public function getId(): ?int { return $this->id; }
    public function getUser(): ?User { return $this->user; }
    public function getToken(): ?string { return $this->token; }
    public function getExpiresAt(): ?\DateTimeImmutable { return $this->expiresAt; }
    public function getCreatedAt(): ?\DateTimeImmutable { return $this->createdAt; }
    public function isUsed(): bool { return $this->used; }

    public function setUsed(bool $used): static
    {
        $this->used = $used;
        return $this;
    }

    public function isExpired(): bool
    {
        return $this->expiresAt < new \DateTimeImmutable();
    }

    public function isValid(): bool
    {
        return !$this->used && !$this->isExpired();
    }
}
