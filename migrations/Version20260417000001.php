<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260417000001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add user_id, module_id, submitted_at, supervisor_note to museum_submissions';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE museum_submissions
            ADD user_id INT DEFAULT NULL,
            ADD module_id INT DEFAULT NULL,
            ADD submitted_at DATETIME DEFAULT NULL,
            ADD supervisor_note LONGTEXT DEFAULT NULL
        ');

        $this->addSql('ALTER TABLE museum_submissions
            ADD CONSTRAINT FK_MS_USER   FOREIGN KEY (user_id)   REFERENCES user (id) ON DELETE SET NULL,
            ADD CONSTRAINT FK_MS_MODULE FOREIGN KEY (module_id) REFERENCES activity_modules (id) ON DELETE SET NULL
        ');

        $this->addSql('CREATE INDEX IDX_MS_USER   ON museum_submissions (user_id)');
        $this->addSql('CREATE INDEX IDX_MS_MODULE ON museum_submissions (module_id)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE museum_submissions DROP FOREIGN KEY FK_MS_USER');
        $this->addSql('ALTER TABLE museum_submissions DROP FOREIGN KEY FK_MS_MODULE');
        $this->addSql('DROP INDEX IDX_MS_USER   ON museum_submissions');
        $this->addSql('DROP INDEX IDX_MS_MODULE ON museum_submissions');
        $this->addSql('ALTER TABLE museum_submissions
            DROP COLUMN user_id,
            DROP COLUMN module_id,
            DROP COLUMN submitted_at,
            DROP COLUMN supervisor_note
        ');
    }
}
