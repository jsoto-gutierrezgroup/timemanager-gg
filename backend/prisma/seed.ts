import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Roles
  const adminRole = await prisma.roles.upsert({
    where: { nombre: 'Administrador' },
    update: {},
    create: { nombre: 'Administrador', permisos: { all: true } },
  });

  await prisma.roles.upsert({
    where: { nombre: 'Usuario' },
    update: {},
    create: { nombre: 'Usuario', permisos: { all: false } },
  });

  // Categorías
  const categoria = await prisma.categorias_usuario.upsert({
    where: { nombre: 'Socio' },
    update: {},
    create: { nombre: 'Socio' },
  });

  await prisma.categorias_usuario.upsert({ where: { nombre: 'Abogado Senior' }, update: {}, create: { nombre: 'Abogado Senior' } });
  await prisma.categorias_usuario.upsert({ where: { nombre: 'Abogado Junior' }, update: {}, create: { nombre: 'Abogado Junior' } });
  await prisma.categorias_usuario.upsert({ where: { nombre: 'Paralegal' }, update: {}, create: { nombre: 'Paralegal' } });

  // Áreas de práctica
  const area = await prisma.areas_practica.upsert({
    where: { nombre: 'General Legal Advisory' },
    update: {},
    create: { nombre: 'General Legal Advisory' },
  });

  await prisma.areas_practica.upsert({ where: { nombre: 'Real Estate' }, update: {}, create: { nombre: 'Real Estate' } });
  await prisma.areas_practica.upsert({ where: { nombre: 'Visa Application' }, update: {}, create: { nombre: 'Visa Application' } });
  await prisma.areas_practica.upsert({ where: { nombre: 'Civil Trust' }, update: {}, create: { nombre: 'Civil Trust' } });
  await prisma.areas_practica.upsert({ where: { nombre: 'Citizenship' }, update: {}, create: { nombre: 'Citizenship' } });

  // Usuario admin
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuarios.upsert({
    where: { email: 'admin@timemanager.com' },
    update: {},
    create: {
      nombre: 'Administrador',
      email: 'admin@timemanager.com',
      password_hash: passwordHash,
      rol_id: adminRole.id,
      categoria_id: categoria.id,
      area_practica_id: area.id,
      estado: 'Activo',
    },
  });

  console.log('✓ Seed completado');
  console.log(`✓ Usuario admin: ${admin.email} / admin123`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
