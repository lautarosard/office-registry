-- CreateEnum
CREATE TYPE "RoleUser" AS ENUM ('User', 'Admin', 'SuperAdmin');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "RoleUser" NOT NULL DEFAULT 'User',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Register" (
    "id" TEXT NOT NULL,
    "ex" TEXT NOT NULL,
    "doc_trabajo" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "reparticion" TEXT NOT NULL,
    "pase" TEXT NOT NULL,
    "dia" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "Register_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Register" ADD CONSTRAINT "Register_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
