<?php

namespace App\Entity;

use App\Repository\ActivityModuleRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: ActivityModuleRepository::class)]
#[ORM\Table(name: 'activity_modules')]
class ActivityModule
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 100)]
    #[Assert\NotBlank]
    private ?string $name = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $emoji = null;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $supervisorName = null;

    #[ORM\Column(length: 20, options: ['default' => 'ACTIVE'])]
    private string $status = 'ACTIVE';

    #[ORM\Column(name: 'workshop_day', length: 20, nullable: true)]
    private ?string $workshopDay = null;

    #[ORM\Column(name: 'workshop_time', length: 10, nullable: true)]
    private ?string $workshopTime = null;

    #[ORM\Column(name: 'workshop_description', type: \Doctrine\DBAL\Types\Types::TEXT, nullable: true)]
    private ?string $workshopDescription = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getEmoji(): ?string
    {
        return $this->emoji;
    }

    public function setEmoji(?string $emoji): static
    {
        $this->emoji = $emoji;
        return $this;
    }

    public function getSupervisorName(): ?string
    {
        return $this->supervisorName;
    }

    public function setSupervisorName(?string $supervisorName): static
    {
        $this->supervisorName = $supervisorName;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function isActive(): bool
    {
        return $this->status === 'ACTIVE';
    }

    public function getWorkshopDay(): ?string { return $this->workshopDay; }
    public function setWorkshopDay(?string $day): static { $this->workshopDay = $day; return $this; }

    public function getWorkshopTime(): ?string { return $this->workshopTime; }
    public function setWorkshopTime(?string $time): static { $this->workshopTime = $time; return $this; }

    public function getWorkshopDescription(): ?string { return $this->workshopDescription; }
    public function setWorkshopDescription(?string $desc): static { $this->workshopDescription = $desc; return $this; }

    public function hasWorkshopSchedule(): bool
    {
        return $this->workshopDay !== null && $this->workshopTime !== null;
    }

    public function __toString(): string
    {
        return ($this->emoji ?? '') . ' ' . $this->name;
    }
}
