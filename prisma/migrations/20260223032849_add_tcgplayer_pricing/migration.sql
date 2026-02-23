-- CreateTable
CREATE TABLE "TcgplayerProduct" (
    "id" INTEGER NOT NULL,
    "cardName" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "printing" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "variantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TcgplayerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" SERIAL NOT NULL,
    "tcgplayerProductId" INTEGER NOT NULL,
    "marketPrice" DOUBLE PRECISION,
    "lowPrice" DOUBLE PRECISION,
    "medianPrice" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TcgplayerProduct_variantId_idx" ON "TcgplayerProduct"("variantId");

-- CreateIndex
CREATE INDEX "TcgplayerProduct_cardName_setName_printing_idx" ON "TcgplayerProduct"("cardName", "setName", "printing");

-- CreateIndex
CREATE INDEX "PriceSnapshot_tcgplayerProductId_recordedAt_idx" ON "PriceSnapshot"("tcgplayerProductId", "recordedAt");

-- AddForeignKey
ALTER TABLE "TcgplayerProduct" ADD CONSTRAINT "TcgplayerProduct_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "CardVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_tcgplayerProductId_fkey" FOREIGN KEY ("tcgplayerProductId") REFERENCES "TcgplayerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
