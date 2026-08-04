# Contributing to AortaLink EHR Platform

Thank you for your interest in contributing to **AortaLink**, an Open-Source AI-Powered Electronic Health Record (EHR) Platform built on HL7 FHIR Version R4 standards!

---

## 📜 Code of Conduct

We are committed to providing a welcoming, inclusive, and safe community for healthtech developers, clinicians, and contributors worldwide.

---

## 🛠️ Development Workflow

1. **Fork & Clone**: Fork the repository on GitHub and clone your fork locally.
   ```bash
   git clone https://github.com/your-username/HeartSync.git
   cd HeartSync
   ```

2. **Branching Strategy**: Create a feature branch matching Conventional Commits syntax:
   ```bash
   git checkout -b feat/fhir-observation-enhancement
   ```

3. **Code Quality & Type Safety**:
   - Ensure strict TypeScript compliance (`npm run lint`).
   - Follow HL7 FHIR R4 schema definitions under `src/types/blood-pressure.ts`.
   - Use LOINC codes for any new clinical parameters.

4. **Testing & Build Verification**:
   ```bash
   npm run lint
   npm run build
   ```

5. **Commit Message Format**:
   - `feat(core): add new FHIR resource parser`
   - `fix(cdss): adjust nocturnal dipping threshold calculation`
   - `docs(readme): update FHIR mapping table`

6. **Submit Pull Request**: Push your branch to GitHub and create a Pull Request with a clear description of the clinical or technical motivation behind your changes.

Thank you for helping us build the future of open-source clinical data interoperability! 🫀
