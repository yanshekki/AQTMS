describe('Portfolio Dashboard', () => {
  beforeEach(() => {
    cy.visit('/portfolio');
  });

  it('should load the portfolio dashboard', () => {
    cy.contains('Portfolio Dashboard').should('be.visible');
    cy.contains('資產分配').should('be.visible');
  });

  it('should show real-time update indicator', () => {
    cy.contains('實時更新中').should('exist');
  });

  it('should display positions table', () => {
    cy.get('table').should('exist');
  });
});
