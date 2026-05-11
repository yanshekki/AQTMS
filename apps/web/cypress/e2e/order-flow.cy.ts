describe('Order Flow', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should allow selecting order type', () => {
    cy.contains('Quick Order').should('be.visible');
    cy.contains('Market').click();
    cy.contains('Limit').click();
    cy.contains('Stop').click();
  });

  it('should show warning in LIVE mode', () => {
    cy.contains('LIVE').click();
    cy.contains('Real funds at risk').should('be.visible');
  });

  it('should handle basic order input', () => {
    cy.get('input[placeholder*="Amount"]').type('0.001');
    cy.get('input[placeholder*="Price"]').type('60000');
    // In real test, mock backend response
  });
});
