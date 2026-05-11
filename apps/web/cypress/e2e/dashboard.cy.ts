describe('Dashboard Trading Terminal', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the trading terminal', () => {
    cy.contains('Trading Terminal').should('be.visible');
    cy.contains('Quick Order').should('be.visible');
  });

  it('should allow switching between modes', () => {
    cy.contains('PAPER').click();
    cy.contains('TESTNET').click();
    cy.contains('LIVE').click();
    // In real test, assert warning appears for LIVE
  });

  it('should show real-time connection status', () => {
    cy.contains('WebSocket Connected').should('exist');
  });
});
