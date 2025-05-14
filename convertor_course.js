const fs = require('fs');
const path = require('path');

// Pad naar input/output bestanden
const inputPath = path.join(__dirname, 'lesson.json');
const outputPath = path.join(__dirname, 'course_content.json');

// Laad originele JSON-bestand
const originalData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function stripHtml(html) {
    return html
        .replace(/&nbsp;/g, ' ')                             // vervang &nbsp; door spatie
        .replace(/<\/(p|li|h[1-9]|div|br)>/gi, '\n')         // voeg \n in na blok-elementen
        .replace(/<[^>]+>/g, '')                             // verwijder alle overige HTML-tags
        .replace(/\n{2,}/g, '\n')                            // voorkom dubbele lege regels
        .replace(/[ \t]+/g, ' ')                             // normaliseer spaties/tabs
        .replace(/ *\n */g, '\n')                            // trim spaties rond nieuwe regels
        .trim();
}

// Alleen deze widget types zijn toegestaan
const allowedTypes = [
    'quiz_radio',
    'quiz_check',
    'rich_text'
];

const output = {};

if (
    originalData &&
    originalData.lesson &&
    Array.isArray(originalData.lesson.chapters)
) {
    originalData.lesson.chapters.forEach((chapter) => {
        chapter.sections.forEach((section) => {
            if (section.type === 'content' && Array.isArray(section.widgets)) {
                section.widgets.forEach((widget) => {
                    const id = widget.id || widget._id || 'unknown_id';
                    const setting = widget.setting_id;

                    if (!setting || setting.deleted || !allowedTypes.includes(setting.widget_type)) return;

                    const key = `${setting.widget_type}_${id}`;

                    if (setting.widget_type === 'rich_text') {
                        if (setting.description && setting.description.trim()) {
                            output[key] = stripHtml(setting.description);
                        }
                    } else {
                        let answer_texts = [];
                        const answer_ids = Array.isArray(setting.answer?.solution_ids)
                            ? setting.answer.solution_ids
                            : [setting.answer?.solution_id].filter(Boolean);

                        if (Array.isArray(setting.options) && answer_ids.length > 0) {
                            setting.options.forEach((option) => {
                                if (answer_ids.includes(option.id)) {
                                    answer_texts.push(option.text);
                                }
                            });
                        }
                        output[key] = {
                            title: setting.title,
                            type: setting.widget_type,
                            options: setting.options?.map(o => o.text) || [],
                            answer_id: answer_ids,
                            answer_text: answer_texts.length > 0 ? answer_texts : null
                        };
                    }
                });
            }
        });
    });
}

// Schrijf het resultaat naar een nieuwe JSON file
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
console.log(`✅ Bestand succesvol opgeslagen op: ${outputPath}`);