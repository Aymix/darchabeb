<?php

namespace App\Entity;

use App\Repository\UserRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Gedmo\Mapping\Annotation as Gedmo;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\HttpFoundation\File\File;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: 'user')]
#[UniqueEntity(fields: ['email'], message: 'This email is already registered.')]
#[Vich\Uploadable]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\NotBlank(message: 'First name is required.')]
    #[Assert\Regex(pattern: '/^[a-zA-Z\s]{2,30}$/', message: 'First name must contain only letters (2-30 characters).')]
    private ?string $firstName = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Assert\NotBlank(message: 'Last name is required.')]
    #[Assert\Regex(pattern: '/^[a-zA-Z\s]{2,30}$/', message: 'Last name must contain only letters (2-30 characters).')]
    private ?string $lastName = null;

    #[ORM\Column(length: 255, unique: true, nullable: true)]
    #[Assert\NotBlank(message: 'Email is required.')]
    #[Assert\Email(message: 'Invalid email format.')]
    private ?string $email = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $password = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $role = null;

    #[ORM\Column(options: ['default' => 0])]
    #[Assert\Range(min: 5, max: 100, notInRangeMessage: 'Age must be between {{ min }} and {{ max }}.')]
    private int $age = 0;

    #[ORM\Column(options: ['default' => 0])]
    private int $points = 0;

    #[ORM\Column(options: ['default' => 1])]
    private int $level = 1;

    #[ORM\Column(options: ['default' => 0])]
    private int $xp = 0;

    #[ORM\Column(options: ['default' => false])]
    private bool $blocked = false;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $blockReason = null;

    #[ORM\Column(name: 'display_name', length: 100, nullable: true)]
    private ?string $displayName = null;

    #[Vich\UploadableField(mapping: 'user_avatar', fileNameProperty: 'avatarPath')]
    private ?File $avatarFile = null;

    #[ORM\Column(name: 'avatar_path', length: 255, nullable: true)]
    private ?string $avatarPath = null;

    #[ORM\Column(name: 'updated_at', type: \Doctrine\DBAL\Types\Types::DATETIME_MUTABLE, nullable: true)]
    #[Gedmo\Timestampable(on: 'update')]
    private ?\DateTimeInterface $updatedAt = null;

    #[ORM\Column(name: 'login_count', options: ['default' => 0])]
    private int $loginCount = 0;

    #[ORM\Column(name: 'password_change_token', length: 100, nullable: true)]
    private ?string $passwordChangeToken = null;

    #[ORM\Column(name: 'password_change_token_expires_at', type: \Doctrine\DBAL\Types\Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $passwordChangeTokenExpiresAt = null;

    #[ORM\OneToMany(targetEntity: Post::class, mappedBy: 'author')]
    private Collection $posts;

    #[ORM\OneToMany(targetEntity: Drawing::class, mappedBy: 'user')]
    private Collection $drawings;

    public function __construct()
    {
        $this->posts = new ArrayCollection();
        $this->drawings = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function setFirstName(?string $firstName): static
    {
        $this->firstName = $firstName;
        return $this;
    }

    public function getLastName(): ?string
    {
        return $this->lastName;
    }

    public function setLastName(?string $lastName): static
    {
        $this->lastName = $lastName;
        return $this;
    }

    public function getFullName(): string
    {
        return trim($this->firstName . ' ' . $this->lastName);
    }

    /** Returns the display name (art name) if set, otherwise the full name */
    public function getDisplayOrFullName(): string
    {
        return $this->displayName ?: $this->getFullName();
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): static
    {
        $this->email = $email;
        return $this;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(?string $password): static
    {
        $this->password = $password;
        return $this;
    }

    public function getRole(): ?string
    {
        return $this->role;
    }

    public function setRole(?string $role): static
    {
        $this->role = $role;
        return $this;
    }

    public function getAge(): int
    {
        return $this->age;
    }

    public function setAge(int $age): static
    {
        $this->age = $age;
        return $this;
    }

    public function getPoints(): int
    {
        return $this->points;
    }

    public function setPoints(int $points): static
    {
        $this->points = $points;
        return $this;
    }

    public function getLevel(): int
    {
        return $this->level;
    }

    public function setLevel(int $level): static
    {
        $this->level = $level;
        return $this;
    }

    public function getXp(): int
    {
        return $this->xp;
    }

    public function setXp(int $xp): static
    {
        $this->xp = $xp;
        return $this;
    }

    public function isBlocked(): bool
    {
        return $this->blocked;
    }

    public function setBlocked(bool $blocked): static
    {
        $this->blocked = $blocked;
        return $this;
    }

    public function getBlockReason(): ?string
    {
        return $this->blockReason;
    }

    public function setBlockReason(?string $blockReason): static
    {
        $this->blockReason = $blockReason;
        return $this;
    }

    /** @return Collection<int, Post> */
    public function getPosts(): Collection
    {
        return $this->posts;
    }

    /** @return Collection<int, Drawing> */
    public function getDrawings(): Collection
    {
        return $this->drawings;
    }

    // --- Profile management ---

    public function getDisplayName(): ?string { return $this->displayName; }
    public function setDisplayName(?string $name): static { $this->displayName = $name; return $this; }

    public function getAvatarFile(): ?File { return $this->avatarFile; }
    public function setAvatarFile(?File $file): static {
        $this->avatarFile = $file;
        if ($file) { $this->updatedAt = new \DateTime(); }
        return $this;
    }

    public function getAvatarPath(): ?string { return $this->avatarPath; }
    public function setAvatarPath(?string $path): static { $this->avatarPath = $path; return $this; }

    public function getUpdatedAt(): ?\DateTimeInterface { return $this->updatedAt; }
    public function setUpdatedAt(?\DateTimeInterface $dt): static { $this->updatedAt = $dt; return $this; }

    public function getLoginCount(): int { return $this->loginCount; }
    public function setLoginCount(int $count): static { $this->loginCount = $count; return $this; }

    public function getPasswordChangeToken(): ?string { return $this->passwordChangeToken; }
    public function setPasswordChangeToken(?string $token): static { $this->passwordChangeToken = $token; return $this; }

    public function getPasswordChangeTokenExpiresAt(): ?\DateTimeInterface { return $this->passwordChangeTokenExpiresAt; }
    public function setPasswordChangeTokenExpiresAt(?\DateTimeInterface $dt): static { $this->passwordChangeTokenExpiresAt = $dt; return $this; }

    // --- Symfony Security UserInterface ---

    public function getUserIdentifier(): string
    {
        return (string) $this->email;
    }

    /** @return list<string> */
    public function getRoles(): array
    {
        $roles = ['ROLE_USER'];

        return match (strtoupper($this->role ?? '')) {
            'ADMIN' => ['ROLE_ADMIN', 'ROLE_USER'],
            'SUPERVISEUR', 'SUPERVISOR' => ['ROLE_SUPERVISOR', 'ROLE_USER'],
            default => $roles,
        };
    }

    public function eraseCredentials(): void
    {
        // Nothing to erase — we don't store plaintext passwords in memory
    }

    public function __serialize(): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'password' => $this->password,
        ];
    }

    public function __unserialize(array $data): void
    {
        $this->id = $data['id'] ?? null;
        $this->email = $data['email'] ?? null;
        $this->password = $data['password'] ?? null;
    }

    public function __toString(): string
    {
        return $this->getFullName() . ' (' . $this->email . ')';
    }
}
