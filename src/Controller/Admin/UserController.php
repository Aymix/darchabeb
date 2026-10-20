<?php

namespace App\Controller\Admin;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/users')]
#[IsGranted('ROLE_ADMIN')]
class UserController extends AbstractController
{
    // ─────────────────────────────────────────────
    //  LIST (with search)
    // ─────────────────────────────────────────────

    #[Route('', name: 'app_admin_users')]
    public function index(Request $request, UserRepository $repo): Response
    {
        $q = trim((string) $request->query->get('q', ''));
        $users = $q !== '' ? $repo->searchByNameOrEmail($q) : $repo->findBy([], ['id' => 'ASC']);

        return $this->render('admin/users/index.html.twig', [
            'users'  => $users,
            'search' => $q,
        ]);
    }

    // ─────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────

    #[Route('/create', name: 'app_admin_user_create', methods: ['GET', 'POST'])]
    public function create(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): Response {
        if ($request->isMethod('POST')) {
            $user = new User();
            $user->setFirstName($request->request->get('first_name'));
            $user->setLastName($request->request->get('last_name'));
            $user->setEmail($request->request->get('email'));
            $user->setAge((int) $request->request->get('age', 0));
            $user->setRole($request->request->get('role', 'USER'));

            $plainPassword = $request->request->get('password', '');
            if ($plainPassword !== '') {
                $user->setPassword($hasher->hashPassword($user, $plainPassword));
            }

            $em->persist($user);
            $em->flush();

            $this->addFlash('success', '✅ User created successfully.');
            return $this->redirectToRoute('app_admin_users');
        }

        return $this->render('admin/users/form.html.twig', [
            'user'     => null,
            'formTitle'=> 'Create New User',
        ]);
    }

    // ─────────────────────────────────────────────
    //  EDIT
    // ─────────────────────────────────────────────

    #[Route('/{id}/edit', name: 'app_admin_user_edit', methods: ['GET', 'POST'])]
    public function edit(
        int $id,
        Request $request,
        UserRepository $repo,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): Response {
        $user = $repo->find($id);
        if (!$user) {
            $this->addFlash('error', 'User not found.');
            return $this->redirectToRoute('app_admin_users');
        }

        if ($request->isMethod('POST')) {
            $user->setFirstName($request->request->get('first_name'));
            $user->setLastName($request->request->get('last_name'));
            $user->setEmail($request->request->get('email'));
            $user->setAge((int) $request->request->get('age', 0));
            $user->setRole($request->request->get('role', 'USER'));

            $plainPassword = $request->request->get('password', '');
            if ($plainPassword !== '') {
                $user->setPassword($hasher->hashPassword($user, $plainPassword));
            }

            $em->flush();

            $this->addFlash('success', '✅ User updated successfully.');
            return $this->redirectToRoute('app_admin_users');
        }

        return $this->render('admin/users/form.html.twig', [
            'user'     => $user,
            'formTitle'=> 'Edit User',
        ]);
    }

    // ─────────────────────────────────────────────
    //  DELETE
    // ─────────────────────────────────────────────

    #[Route('/{id}/delete', name: 'app_admin_user_delete', methods: ['POST'])]
    public function delete(int $id, UserRepository $repo, EntityManagerInterface $em): Response
    {
        $user = $repo->find($id);
        if ($user) {
            $em->remove($user);
            $em->flush();
            $this->addFlash('success', '🗑️ User deleted.');
        }
        return $this->redirectToRoute('app_admin_users');
    }

    // ─────────────────────────────────────────────
    //  TOGGLE BLOCK
    // ─────────────────────────────────────────────

    #[Route('/{id}/toggle-block', name: 'app_admin_user_toggle_block', methods: ['POST'])]
    public function toggleBlock(int $id, UserRepository $repo, EntityManagerInterface $em): Response
    {
        $user = $repo->find($id);
        if ($user) {
            $user->setBlocked(!$user->isBlocked());
            $em->flush();
            $action = $user->isBlocked() ? '🔒 blocked' : '🔓 unblocked';
            $this->addFlash('success', sprintf('User "%s" has been %s.', $user->getFullName(), $action));
        }
        return $this->redirectToRoute('app_admin_users');
    }
}
