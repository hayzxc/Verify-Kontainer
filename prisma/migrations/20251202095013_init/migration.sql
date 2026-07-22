-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shipperName" TEXT NOT NULL,
    "containerNumber" TEXT NOT NULL,
    "commodityType" TEXT NOT NULL,
    "photoShipper" TEXT,
    "photoContainer" TEXT,
    "photoCommodity" TEXT,
    "photoIspm" TEXT,
    "photoStacking" TEXT,
    "photoMoisture" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "locationTimestamp" TEXT,
    "mapsLink" TEXT,
    "notes" TEXT,
    "stackingDescription" TEXT,
    "moistureDescription" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "adminNotes" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
