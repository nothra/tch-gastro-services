# Contributing to dm Development Factory Template

Thank you for helping improve the Factory Template!
Every improvement here benefits all projects that use it.

---

## How contributions work

The Factory Template is a **living document** – it grows through real project experience.
The best contributions come from using the template on actual projects and feeding
learnings back (this is exactly what `/codify` does at the project level).

---

## Types of contributions

### 🔧 Improving existing files
- Fixing mistakes or unclear instructions in skills or agent personas
- Improving coding guidelines based on real project experience
- Strengthening quality gate scripts

### ➕ Adding new content
- New skills for use cases not yet covered
- Tech-stack-specific guideline extensions (e.g. Java/Spring, TypeScript/Next.js)
- Additional check scripts for common pitfalls

### 📖 Documentation
- Improving the README or CONTRIBUTING guide
- Adding concrete examples to guidelines
- Documenting patterns that worked well in practice

---

## How to contribute

1. **Clone the repository**
   ```bash
   git clone https://github.com/nothra/tch-gastro-services
   cd tch-gastro-services
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b improvement/your-short-description
   ```

3. **Make your changes**
   - Keep changes focused – one improvement per Pull Request
   - If you're adding a new skill, follow the structure of existing ones in `.claude/commands/`
   - If you're adding a guideline, keep it universal – no project-specific content

4. **Test your changes**
   - Apply the changed template to a real project and verify it works
   - Run shell scripts through bash syntax check:
     ```bash
     bash -n scripts/your-script.sh
     ```

5. **Open a Pull Request**
   - Title: short and descriptive (e.g. `Add Java/Spring Boot coding guidelines`)
   - Description: What changed, why, and ideally: in which project was it tested?
   - Assign to a Maintainer for review

---

## Contribution guidelines

- **Universal over specific:** Changes to core files (CLAUDE.md, guidelines, agent personas)
  should work for any project and tech stack. Tech-stack-specific content
  belongs in a clearly named extension file.

- **Tested in practice:** The best contributions are patterns that have proven
  themselves in a real project – not theoretical improvements.

- **One thing at a time:** Small, focused MRs get reviewed and merged faster
  than large ones covering multiple topics.

- **Explain the why:** What problem does this change solve?
  What went wrong without it?

---

## Versioning

The template follows [Semantic Versioning](https://semver.org/):

| Change type | Version bump | Example |
|-------------|-------------|---------|
| New skills, major additions | Minor: `v1.1.0` | Adding `/deploy` skill |
| Bug fixes, clarifications | Patch: `v1.0.1` | Fixing a script error |
| Breaking changes to structure | Major: `v2.0.0` | Restructuring the whole pipeline |

After merging significant contributions, a Maintainer creates a new release with changelog.

---

## Questions?

Open an issue in the project or reach out directly via Teams.
