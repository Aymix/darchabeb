<?php

namespace App\Entity;

use App\Repository\MuseumSubmissionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\HttpFoundation\File\File;
use Vich\UploaderBundle\Mapping\Annotation as Vich;

#[ORM\Entity(repositoryClass: MuseumSubmissionRepository::class)]
#[ORM\Table(name: 'museum_submissions')]
#[Vich\Uploadable]
class MuseumSubmission
{
    public const STATUS_PENDING  = 'PENDING';
    public const STATUS_ACCEPTED = 'ACCEPTED';
    public const STATUS_REFUSED  = 'REFUSED';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(name: 'artwork_id', nullable: true)]
    private ?int $artworkId = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $type = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $status = null;

    #[Vich\UploadableField(mapping: 'museum_artwork', fileNameProperty: 'imagePath')]
    private ?File $imageFile = null;

    #[ORM\Column(name: 'image_path', length: 255, nullable: true)]
    private ?string $imagePath = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $title = null;

    /** Who submitted this work */
    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(name: 'user_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?User $user = null;

    /** Which module this submission belongs to */
    #[ORM\ManyToOne(targetEntity: ActivityModule::class)]
    #[ORM\JoinColumn(name: 'module_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
    private ?ActivityModule $module = null;

    #[ORM\Column(name: 'submitted_at', type: Types::DATETIME_MUTABLE, nullable: true)]
    private ?\DateTimeInterface $submittedAt = null;

    /** Optional note from supervisor explaining acceptance or refusal */
    #[ORM\Column(name: 'supervisor_note', type: Types::TEXT, nullable: true)]
    private ?string $supervisorNote = null;

    /** Whether this submission was auto-approved by AI analysis */
    #[ORM\Column(name: 'ai_auto_approved', options: ['default' => false])]
    private bool $aiAutoApproved = false;

    /** Price set by the artist for this artwork */
    #[ORM\Column(type: Types::DECIMAL, precision: 10, scale: 2, nullable: true)]
    private ?string $price = null;

    public function __construct()
    {
        $this->submittedAt = new \DateTime();
        $this->status      = self::STATUS_PENDING;
    }

    public function getId(): ?int { return $this->id; }

    public function getArtworkId(): ?int { return $this->artworkId; }
    public function setArtworkId(?int $artworkId): static { $this->artworkId = $artworkId; return $this; }

    public function getType(): ?string { return $this->type; }
    public function setType(?string $type): static { $this->type = $type; return $this; }

    public function getStatus(): ?string { return $this->status; }
    public function setStatus(?string $status): static { $this->status = $status; return $this; }

    public function getImageFile(): ?File { return $this->imageFile; }
    public function setImageFile(?File $file): static {
        $this->imageFile = $file;
        if ($file) { $this->submittedAt = new \DateTime(); }
        return $this;
    }

    public function getImagePath(): ?string { return $this->imagePath; }
    public function setImagePath(?string $imagePath): static { $this->imagePath = $imagePath; return $this; }

    public function getTitle(): ?string { return $this->title; }
    public function setTitle(?string $title): static { $this->title = $title; return $this; }

    public function getUser(): ?User { return $this->user; }
    public function setUser(?User $user): static { $this->user = $user; return $this; }

    public function getModule(): ?ActivityModule { return $this->module; }
    public function setModule(?ActivityModule $module): static { $this->module = $module; return $this; }

    public function getSubmittedAt(): ?\DateTimeInterface { return $this->submittedAt; }
    public function setSubmittedAt(?\DateTimeInterface $dt): static { $this->submittedAt = $dt; return $this; }

    public function getSupervisorNote(): ?string { return $this->supervisorNote; }
    public function setSupervisorNote(?string $note): static { $this->supervisorNote = $note; return $this; }

    public function isAiAutoApproved(): bool { return $this->aiAutoApproved; }
    public function setAiAutoApproved(bool $v): static { $this->aiAutoApproved = $v; return $this; }

    public function getPrice(): ?string { return $this->price; }
    public function setPrice(?string $price): static { $this->price = $price; return $this; }

    public function isPending(): bool  { return $this->status === self::STATUS_PENDING; }
    public function isAccepted(): bool { return $this->status === self::STATUS_ACCEPTED; }
    public function isRefused(): bool  { return $this->status === self::STATUS_REFUSED; }

    public function __toString(): string { return $this->title ?? ''; }
}
