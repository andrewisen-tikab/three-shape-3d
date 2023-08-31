import { EXAMPLES } from '../../../examples.js';

describe('template spec', () => {
    EXAMPLES.forEach((example) => {
        it(`Visit ${example}`, () => {
            cy.visit(`${example}/`);
            cy.get('#e2e').should('exist');
        });
    });
});
