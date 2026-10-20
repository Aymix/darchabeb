<?php

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

class BuildSupController extends AbstractController
{
    #[Route('/dev/create-sup2', name: 'app_dev_create_sup2')]
    public function createSup2(
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): Response {
        $user = new User();
        $user->setFirstName('Supervisor');
        $user->setLastName('Two');
        $user->setEmail('supervisor2@virtuarts.com');
        $user->setRole('SUPERVISOR');
        $user->setAge(30);
        $user->setPassword(
            $hasher->hashPassword($user, 'supervisor123')
        );

        $em->persist($user);
        $em->flush();

        return new Response('<html><body><h1>Supervisor 2 Created!</h1><p>Email: supervisor2@virtuarts.com<br>Password: supervisor123</p><a href="/login">Go to Login</a></body></html>');
    }
}
