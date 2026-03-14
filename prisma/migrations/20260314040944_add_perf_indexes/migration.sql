-- CreateIndex
CREATE INDEX "CardSet_cardId_idx" ON "CardSet"("cardId");

-- CreateIndex
CREATE INDEX "CardSet_setId_idx" ON "CardSet"("setId");

-- CreateIndex
CREATE INDEX "CardVariant_cardId_finish_idx" ON "CardVariant"("cardId", "finish");
