<?php

namespace App\Entity;

use App\Repository\LayerRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: LayerRepository::class)]
#[ORM\Table(name: 'layer')]
class Layer
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name = null;

    #[ORM\ManyToOne(targetEntity: Drawing::class, inversedBy: 'layers')]
    #[ORM\JoinColumn(name: 'drawing_id', referencedColumnName: 'id')]
    private ?Drawing $drawing = null;

    #[ORM\Column(name: 'order_index', nullable: true)]
    private ?int $orderIndex = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $visible = true;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getDrawing(): ?Drawing
    {
        return $this->drawing;
    }

    public function setDrawing(?Drawing $drawing): static
    {
        $this->drawing = $drawing;
        return $this;
    }

    public function getOrderIndex(): ?int
    {
        return $this->orderIndex;
    }

    public function setOrderIndex(?int $orderIndex): static
    {
        $this->orderIndex = $orderIndex;
        return $this;
    }

    public function isVisible(): bool
    {
        return $this->visible;
    }

    public function setVisible(bool $visible): static
    {
        $this->visible = $visible;
        return $this;
    }
}
