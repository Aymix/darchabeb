<?php

namespace App\Controller\Admin;

use App\Entity\ActivityModule;
use App\Repository\ActivityModuleRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/admin/modules')]
#[IsGranted('ROLE_ADMIN')]
class ModuleController extends AbstractController
{
    // ─────────────────────────────────────────────
    //  LIST
    // ─────────────────────────────────────────────

    #[Route('', name: 'app_admin_modules')]
    public function index(ActivityModuleRepository $repo): Response
    {
        return $this->render('admin/modules/index.html.twig', [
            'modules' => $repo->findBy([], ['id' => 'ASC']),
        ]);
    }

    // ─────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────

    #[Route('/create', name: 'app_admin_module_create', methods: ['GET', 'POST'])]
    public function create(Request $request, EntityManagerInterface $em): Response
    {
        if ($request->isMethod('POST')) {
            $module = new ActivityModule();
            $module->setName($request->request->get('name'));
            $module->setEmoji($request->request->get('emoji'));
            $module->setSupervisorName($request->request->get('supervisor_name'));
            $module->setStatus($request->request->get('status', 'ACTIVE'));

            $em->persist($module);
            $em->flush();

            $this->addFlash('success', '✅ Module created.');
            return $this->redirectToRoute('app_admin_modules');
        }

        return $this->render('admin/modules/form.html.twig', [
            'module'    => null,
            'formTitle' => 'Add Module',
        ]);
    }

    // ─────────────────────────────────────────────
    //  EDIT
    // ─────────────────────────────────────────────

    #[Route('/{id}/edit', name: 'app_admin_module_edit', methods: ['GET', 'POST'])]
    public function edit(
        int $id,
        Request $request,
        ActivityModuleRepository $repo,
        EntityManagerInterface $em
    ): Response {
        $module = $repo->find($id);
        if (!$module) {
            $this->addFlash('error', 'Module not found.');
            return $this->redirectToRoute('app_admin_modules');
        }

        if ($request->isMethod('POST')) {
            $module->setName($request->request->get('name'));
            $module->setEmoji($request->request->get('emoji'));
            $module->setSupervisorName($request->request->get('supervisor_name'));
            $module->setStatus($request->request->get('status', 'ACTIVE'));
            $em->flush();

            $this->addFlash('success', '✅ Module updated.');
            return $this->redirectToRoute('app_admin_modules');
        }

        return $this->render('admin/modules/form.html.twig', [
            'module'    => $module,
            'formTitle' => 'Edit Module',
        ]);
    }

    // ─────────────────────────────────────────────
    //  DELETE
    // ─────────────────────────────────────────────

    #[Route('/{id}/delete', name: 'app_admin_module_delete', methods: ['POST'])]
    public function delete(int $id, ActivityModuleRepository $repo, EntityManagerInterface $em): Response
    {
        $module = $repo->find($id);
        if ($module) {
            $em->remove($module);
            $em->flush();
            $this->addFlash('success', '🗑️ Module deleted.');
        }
        return $this->redirectToRoute('app_admin_modules');
    }
}
