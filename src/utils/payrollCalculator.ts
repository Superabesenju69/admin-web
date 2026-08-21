/**
 * Nicaraguan Payroll (Nómina) Calculation Engine
 * Reference: Código del Trabajo de Nicaragua & Ley de Concertación Tributaria (Ley 822)
 */

export interface PayrollSettings {
    inss_laboral_rate: number;
    inss_patronal_rate: number;
    overtime_multiplier: number;
    ordinary_daily_hours_limit: number;
    enable_ir_tax_table: boolean;
    aguinaldo_accrual_rate: number;
    vacation_accrual_rate: number;
    professional_ir_retention_rate: number;
}

export const DEFAULT_PAYROLL_SETTINGS: PayrollSettings = {
    inss_laboral_rate: 0.07,         // 7%
    inss_patronal_rate: 0.215,       // 21.5%
    overtime_multiplier: 2.0,        // 200% (double pay)
    ordinary_daily_hours_limit: 8,
    enable_ir_tax_table: true,
    aguinaldo_accrual_rate: 0.0833,  // ~1/12
    vacation_accrual_rate: 0.0833,   // ~1/12 (30 days/year)
    professional_ir_retention_rate: 0.10, // 10% flat IR retention for professional contracts
};

/**
 * Calculates Gross Salary (Salario Bruto) including overtime.
 */
export function calculateGrossSalary(
    ordinaryHours: number,
    hourlyRate: number,
    overtimeHours: number,
    overtimeMultiplier: number = 2.0
): number {
    const ordinaryPay = ordinaryHours * hourlyRate;
    const overtimePay = overtimeHours * (hourlyRate * overtimeMultiplier);
    return Number((ordinaryPay + overtimePay).toFixed(2));
}

/**
 * Calculates INSS Laboral (employee social security contribution - 7%).
 */
export function calculateINSSLaboral(grossSalary: number, rate: number = 0.07): number {
    return Number((grossSalary * rate).toFixed(2));
}

/**
 * Calculates INSS Patronal (employer contribution expense - e.g. 21.5%).
 */
export function calculateINSSPatronal(grossSalary: number, rate: number = 0.215): number {
    return Number((grossSalary * rate).toFixed(2));
}

/**
 * Calculates monthly IR Laboral retention based on projected annual income (Art. 23 Ley 822).
 */
export function calculateIRLaboral(monthlyTaxableBase: number, enable: boolean = true): number {
    if (!enable || monthlyTaxableBase <= 0) return 0;

    // 1. Project annual taxable base
    const projectedAnnualBase = monthlyTaxableBase * 12;

    // 2. Evaluate progressive tax brackets
    let annualTax = 0;
    if (projectedAnnualBase <= 100000) {
        annualTax = 0;
    } else if (projectedAnnualBase > 100000 && projectedAnnualBase <= 200000) {
        annualTax = (projectedAnnualBase - 100000) * 0.15;
    } else if (projectedAnnualBase > 200000 && projectedAnnualBase <= 350000) {
        annualTax = 15000 + (projectedAnnualBase - 200000) * 0.20;
    } else if (projectedAnnualBase > 350000 && projectedAnnualBase <= 500000) {
        annualTax = 45000 + (projectedAnnualBase - 350000) * 0.25;
    } else {
        annualTax = 82500 + (projectedAnnualBase - 500000) * 0.30;
    }

    // 3. Divide back by 12 to get monthly retention
    return Number((annualTax / 12).toFixed(2));
}

/**
 * Calculates Aguinaldo (13th Month Salary) provision (8.33%).
 */
export function calculateAguinaldoAccrual(grossSalary: number, rate: number = 0.0833): number {
    return Number((grossSalary * rate).toFixed(2));
}

/**
 * Calculates Vacation provision accrual (8.33%).
 */
export function calculateVacationAccrual(grossSalary: number, rate: number = 0.0833): number {
    return Number((grossSalary * rate).toFixed(2));
}

/**
 * Calculates final Net Salary (Salario Neto a recibir).
 */
export function calculateNetSalary(
    grossSalary: number,
    inssLaboral: number,
    irRetention: number,
    deductions: number = 0
): number {
    const net = grossSalary - inssLaboral - irRetention - deductions;
    return Number(Math.max(0, net).toFixed(2));
}

/**
 * Calculates flat IR retention for professional services contracts (10%).
 */
export function calculateIRProfessional(grossSalary: number, rate: number = 0.10): number {
    return Number((grossSalary * rate).toFixed(2));
}

