// tests/pdfTemplates.test.cjs
// Unit tests for the pure PDF template builders (no network, no device).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadTsModule(relativePath) {
    const source = fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const context = { exports: {} };
    vm.runInNewContext(compiled, context);
    return context.exports;
}

const { escapeHtml, buildCertificateRef, buildCertificateHtml, buildLabReportHtml } =
    loadTsModule('../src/shared/pdf/pdfTemplates.ts');

const certificate = {
    donorName: 'Nimali Perera',
    hospitalName: 'Teaching Hospital Ratnapura',
    donatedAt: '15 May 2024',
    donationType: 'Whole Blood',
    volumeMl: 450,
    bloodGroup: 'O-',
    donationId: 'don-003',
    isMock: false,
};

const labReport = {
    donorName: 'Nimali Perera',
    donationDate: '15 May 2024',
    reportedBy: 'Dr. Example - Sample Centre',
    hemoglobin: '14.2 g/dL',
    volumeMl: 450,
    infectiousDiseases: 'Negative',
    allClear: true,
    doctorMessage: 'Thank you for donating.',
    isMock: false,
};

const BAD_WORDS = ['undefined', 'null', 'NaN'];

test('escapeHtml escapes & < > " and apostrophes', () => {
    assert.equal(escapeHtml(`&<>"'`), '&amp;&lt;&gt;&quot;&#39;');
});

test('escapeHtml returns an empty string for null and undefined', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
});

test('certificate escapes special characters in the donor name', () => {
    const html = buildCertificateHtml({ ...certificate, donorName: `O'Brien & <Test>` });
    assert.ok(html.includes('O&#39;Brien &amp; &lt;Test&gt;'));
    assert.ok(!html.includes('<Test>'));
});

test('lab report escapes special characters in the donor name and note', () => {
    const html = buildLabReportHtml({
        ...labReport,
        donorName: `A & B <script>`,
        doctorMessage: `Use "care" & <b>rest</b>`,
    });
    assert.ok(html.includes('A &amp; B &lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<b>rest</b>'));
});

test('certificate never prints a NIC even if one is passed in', () => {
    const html = buildCertificateHtml({ ...certificate, nic: '199812345678V' });
    assert.ok(!html.includes('199812345678V'));
    assert.ok(!html.includes('199812'));
});

test('lab report never prints a NIC even if one is passed in', () => {
    const html = buildLabReportHtml({ ...labReport, nic: '199812345678V' });
    assert.ok(!html.includes('199812345678V'));
    assert.ok(!html.includes('199812'));
});

test('buildCertificateRef uses the donation year and id, not the current date', () => {
    assert.equal(buildCertificateRef('don-003', '2024-05-15'), 'BL-2024-0003');
    assert.equal(buildCertificateRef('don-003', '15 May 2024'), 'BL-2024-0003');
    assert.equal(buildCertificateRef('don-002', '10 Nov 2023'), 'BL-2023-0002');
});

test('certificate shows the reference built from the donation year', () => {
    const html = buildCertificateHtml(certificate);
    assert.ok(html.includes('Reference: BL-2024-0003'));
});

test('SAMPLE DATA mark appears only for mock data', () => {
    assert.ok(buildCertificateHtml({ ...certificate, isMock: true }).includes('SAMPLE DATA'));
    assert.ok(!buildCertificateHtml({ ...certificate, isMock: false }).includes('SAMPLE DATA'));
    assert.ok(buildLabReportHtml({ ...labReport, isMock: true }).includes('SAMPLE DATA'));
    assert.ok(!buildLabReportHtml({ ...labReport, isMock: false }).includes('SAMPLE DATA'));
});

test('missing or invalid values print a dash and never undefined, null or NaN', () => {
    const cert = buildCertificateHtml({
        donorName: '',
        hospitalName: '   ',
        donatedAt: '',
        donationType: undefined,
        volumeMl: NaN,
        bloodGroup: null,
        donationId: '',
        isMock: false,
    });
    const lab = buildLabReportHtml({
        donorName: undefined,
        donationDate: '',
        reportedBy: null,
        hemoglobin: '',
        volumeMl: Infinity,
        infectiousDiseases: undefined,
        allClear: false,
        doctorMessage: '',
        isMock: false,
    });
    for (const html of [cert, lab]) {
        for (const word of BAD_WORDS) {
            assert.ok(!html.includes(word), `output must not contain "${word}"`);
        }
    }
    assert.ok(cert.includes('Reference: -'));
});

test('an empty donor name falls back to Valued Donor', () => {
    assert.ok(buildCertificateHtml({ ...certificate, donorName: '' }).includes('Valued Donor'));
    assert.ok(buildLabReportHtml({ ...labReport, donorName: '   ' }).includes('Valued Donor'));
});

test('both documents include their safety footers', () => {
    assert.ok(
        buildCertificateHtml(certificate).includes('appreciation certificate, not a medical document'),
    );
    assert.ok(
        buildLabReportHtml(labReport).includes(
            'Final donor eligibility is decided by qualified blood-bank staff',
        ),
    );
});