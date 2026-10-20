<?php

namespace App\Entity;

use App\Repository\ContributionVersionRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ContributionVersionRepository::class)]
#[ORM\Table(name: 'contribution_version')]
class ContributionVersion
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Scene::class, inversedBy: 'contributionVersions')]
    #[ORM\JoinColumn(name: 'scene_id', referencedColumnName: 'id')]
    private ?Scene $scene = null;

    #[ORM\Column(name: 'author_name', length: 255, nullable: true)]
    private ?string $authorName = null;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $content = null;

    #[ORM\Column(name: 'version_message', type: Types::TEXT, nullable: true)]
    private ?string $versionMessage = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getScene(): ?Scene
    {
        return $this->scene;
    }

    public function setScene(?Scene $scene): static
    {
        $this->scene = $scene;
        return $this;
    }

    public function getAuthorName(): ?string
    {
        return $this->authorName;
    }

    public function setAuthorName(?string $authorName): static
    {
        $this->authorName = $authorName;
        return $this;
    }

    public function getContent(): ?string
    {
        return $this->content;
    }

    public function setContent(?string $content): static
    {
        $this->content = $content;
        return $this;
    }

    public function getVersionMessage(): ?string
    {
        return $this->versionMessage;
    }

    public function setVersionMessage(?string $versionMessage): static
    {
        $this->versionMessage = $versionMessage;
        return $this;
    }
}
