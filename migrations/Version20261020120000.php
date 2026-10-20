<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\DBAL\Types\Types;
use Doctrine\Migrations\AbstractMigration;

/**
 * Face ID (webcam face match) login: opt-in flag, 128-number face template, enrolment date.
 * Uses the schema API so it runs on MySQL/MariaDB and PostgreSQL alike.
 */
final class Version20261020120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add Face ID login columns to user';
    }

    public function up(Schema $schema): void
    {
        $user = $schema->getTable('user');
        $user->addColumn('face_login_enabled', Types::BOOLEAN, ['default' => false]);
        $user->addColumn('face_descriptor', Types::JSON, ['notnull' => false]);
        $user->addColumn('face_enrolled_at', Types::DATETIME_IMMUTABLE, ['notnull' => false]);
    }

    public function down(Schema $schema): void
    {
        $user = $schema->getTable('user');
        $user->dropColumn('face_login_enabled');
        $user->dropColumn('face_descriptor');
        $user->dropColumn('face_enrolled_at');
    }
}
