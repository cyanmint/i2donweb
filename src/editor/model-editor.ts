/**
 * Simple Inochi2D model editor.
 * Provides UI for loading, viewing, and editing puppet properties.
 */

import { Puppet, PuppetMeta } from '../lib/inochi2d/puppet';
import { Node } from '../lib/inochi2d/nodes/node';
import { inImportFromFile } from '../lib/inochi2d/inp';
import { SceneManager } from '../vtubing/scene';

export class ModelEditor {
    private container: HTMLElement;
    private scene: SceneManager | null = null;
    private puppet: Puppet | null = null;
    private selectedNode: Node | null = null;
    private onPuppetLoaded: ((puppet: Puppet) => void) | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.render();
    }

    setOnPuppetLoaded(callback: (puppet: Puppet) => void): void {
        this.onPuppetLoaded = callback;
    }

    private render(): void {
        this.container.innerHTML = `
            <div class="editor-layout">
                <div class="editor-sidebar">
                    <div class="editor-section">
                        <h3>📁 Load Model</h3>
                        <div class="file-drop-zone" id="file-drop-zone">
                            <p>Drag & drop .inx file here</p>
                            <p>or</p>
                            <button class="btn" id="file-pick-btn">Choose File</button>
                            <input type="file" id="file-input" accept=".inx" style="display:none" />
                        </div>
                    </div>
                    <div class="editor-section" id="meta-section" style="display:none">
                        <h3>📋 Puppet Info</h3>
                        <div id="meta-content"></div>
                    </div>
                    <div class="editor-section" id="node-tree-section" style="display:none">
                        <h3>🌲 Node Tree</h3>
                        <div id="node-tree" class="node-tree"></div>
                    </div>
                </div>
                <div class="editor-viewport">
                    <div id="editor-canvas-container" class="canvas-container">
                        <div class="placeholder-text">Load an .inx model to preview</div>
                    </div>
                </div>
                <div class="editor-properties" id="properties-panel" style="display:none">
                    <h3>⚙️ Properties</h3>
                    <div id="properties-content"></div>
                </div>
            </div>
        `;

        this.setupFileHandlers();
    }

    private setupFileHandlers(): void {
        const dropZone = document.getElementById('file-drop-zone')!;
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        const pickBtn = document.getElementById('file-pick-btn')!;

        pickBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length > 0) {
                this.loadFile(fileInput.files[0]);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('drag-over');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('drag-over');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                this.loadFile(e.dataTransfer.files[0]);
            }
        });
    }

    private async loadFile(file: File): Promise<void> {
        const dropZone = document.getElementById('file-drop-zone')!;
        dropZone.innerHTML = '<p>Loading...</p>';

        try {
            this.puppet = await inImportFromFile(file);

            // Set up the 3D viewport
            const canvasContainer = document.getElementById('editor-canvas-container')!;
            canvasContainer.innerHTML = '';
            if (this.scene) {
                this.scene.destroy();
            }
            this.scene = new SceneManager(canvasContainer);
            this.scene.loadPuppet(this.puppet);

            // Update UI
            dropZone.innerHTML = `<p>✅ Loaded: ${file.name}</p><button class="btn" id="file-pick-btn-2">Load Another</button><input type="file" id="file-input-2" accept=".inx" style="display:none" />`;

            const pickBtn2 = document.getElementById('file-pick-btn-2');
            const fileInput2 = document.getElementById('file-input-2') as HTMLInputElement;
            if (pickBtn2 && fileInput2) {
                pickBtn2.addEventListener('click', () => fileInput2.click());
                fileInput2.addEventListener('change', () => {
                    if (fileInput2.files && fileInput2.files.length > 0) {
                        this.loadFile(fileInput2.files[0]);
                    }
                });
            }

            this.showMetadata(this.puppet.meta);
            this.showNodeTree(this.puppet.rootNode);

            if (this.onPuppetLoaded) {
                this.onPuppetLoaded(this.puppet);
            }
        } catch (err) {
            dropZone.innerHTML = `<p>❌ Error loading file</p><p class="error-text">${err instanceof Error ? err.message : String(err)}</p><button class="btn" id="file-pick-btn-retry">Try Again</button><input type="file" id="file-input-retry" accept=".inx" style="display:none" />`;
            const retryBtn = document.getElementById('file-pick-btn-retry');
            const retryInput = document.getElementById('file-input-retry') as HTMLInputElement;
            if (retryBtn && retryInput) {
                retryBtn.addEventListener('click', () => retryInput.click());
                retryInput.addEventListener('change', () => {
                    if (retryInput.files && retryInput.files.length > 0) {
                        this.loadFile(retryInput.files[0]);
                    }
                });
            }
            console.error('Error loading model:', err);
        }
    }

    private showMetadata(meta: PuppetMeta): void {
        const section = document.getElementById('meta-section')!;
        const content = document.getElementById('meta-content')!;
        section.style.display = 'block';

        content.innerHTML = `
            <div class="meta-grid">
                <label>Name</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.name)}" data-field="name" />
                <label>Version</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.version)}" data-field="version" />
                <label>Rigger</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.rigger)}" data-field="rigger" />
                <label>Artist</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.artist)}" data-field="artist" />
                <label>Copyright</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.copyright)}" data-field="copyright" />
                <label>Contact</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.contact)}" data-field="contact" />
                <label>License URL</label>
                <input type="text" class="meta-input" value="${this.escapeHtml(meta.licenseURL)}" data-field="licenseURL" />
                <label>Textures</label>
                <span>${this.puppet?.textures.length ?? 0} loaded</span>
                <label>Nodes</label>
                <span>${this.puppet?.nodes.length ?? 0} total</span>
            </div>
        `;

        // Handle metadata editing
        content.querySelectorAll('.meta-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const target = e.target as HTMLInputElement;
                const field = target.dataset.field as keyof PuppetMeta;
                if (field && this.puppet) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (this.puppet.meta as any)[field] = target.value;
                }
            });
        });
    }

    private showNodeTree(rootNode: Node): void {
        const section = document.getElementById('node-tree-section')!;
        const tree = document.getElementById('node-tree')!;
        section.style.display = 'block';

        tree.innerHTML = this.renderNodeTree(rootNode, 0);

        // Add click handlers for tree nodes
        tree.querySelectorAll('.tree-node-label').forEach(label => {
            label.addEventListener('click', (e) => {
                const target = e.currentTarget as HTMLElement;
                const uuid = parseInt(target.dataset.uuid || '-1');
                const node = this.puppet?.nodes.find(n => n.uuid === uuid);
                if (node) {
                    this.selectNode(node);
                }

                // Update selection styling
                tree.querySelectorAll('.tree-node-label').forEach(l => l.classList.remove('selected'));
                target.classList.add('selected');
            });
        });

        // Add toggle handlers for tree expand/collapse
        tree.querySelectorAll('.tree-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = e.currentTarget as HTMLElement;
                const children = target.parentElement?.querySelector('.tree-children');
                if (children) {
                    children.classList.toggle('collapsed');
                    target.textContent = children.classList.contains('collapsed') ? '▶' : '▼';
                }
            });
        });
    }

    private renderNodeTree(node: Node, depth: number): string {
        const indent = depth * 16;
        const hasChildren = node.children.length > 0;
        const typeIcon = this.getNodeTypeIcon(node.type);
        const name = node.name || node.type || 'unnamed';

        let html = `
            <div class="tree-node" style="padding-left: ${indent}px">
                ${hasChildren ? '<span class="tree-toggle">▼</span>' : '<span class="tree-spacer"></span>'}
                <span class="tree-node-label" data-uuid="${node.uuid}" title="${this.escapeHtml(node.type)}">
                    ${typeIcon} ${this.escapeHtml(name)}
                </span>
            </div>
        `;

        if (hasChildren) {
            html += `<div class="tree-children">`;
            for (const child of node.children) {
                html += this.renderNodeTree(child, depth + 1);
            }
            html += `</div>`;
        }

        return html;
    }

    private getNodeTypeIcon(type: string): string {
        switch (type) {
            case 'Part': return '🖼️';
            case 'Mask': return '🎭';
            case 'PathDeform': return '📐';
            case 'Composite': return '📦';
            default: return '📄';
        }
    }

    private selectNode(node: Node): void {
        this.selectedNode = node;
        const panel = document.getElementById('properties-panel')!;
        const content = document.getElementById('properties-content')!;
        panel.style.display = 'block';

        content.innerHTML = `
            <div class="property-group">
                <h4>General</h4>
                <div class="property-row">
                    <label>Name</label>
                    <input type="text" id="prop-name" value="${this.escapeHtml(node.name || '')}" />
                </div>
                <div class="property-row">
                    <label>Type</label>
                    <span>${this.escapeHtml(node.type)}</span>
                </div>
                <div class="property-row">
                    <label>UUID</label>
                    <span>${node.uuid}</span>
                </div>
                <div class="property-row">
                    <label>Enabled</label>
                    <input type="checkbox" id="prop-enabled" ${node.enabled ? 'checked' : ''} />
                </div>
                <div class="property-row">
                    <label>Z-Sort</label>
                    <input type="number" id="prop-zsort" value="${node.zsort}" step="0.1" />
                </div>
            </div>
            <div class="property-group">
                <h4>Transform</h4>
                <div class="property-row">
                    <label>Position X</label>
                    <input type="number" id="prop-tx" value="${node.transform.trans.x.toFixed(2)}" step="1" />
                </div>
                <div class="property-row">
                    <label>Position Y</label>
                    <input type="number" id="prop-ty" value="${node.transform.trans.y.toFixed(2)}" step="1" />
                </div>
                <div class="property-row">
                    <label>Position Z</label>
                    <input type="number" id="prop-tz" value="${node.transform.trans.z.toFixed(2)}" step="1" />
                </div>
                <div class="property-row">
                    <label>Rotation X</label>
                    <input type="number" id="prop-rx" value="${(node.transform.rot.x * 180 / Math.PI).toFixed(1)}" step="1" />
                </div>
                <div class="property-row">
                    <label>Rotation Y</label>
                    <input type="number" id="prop-ry" value="${(node.transform.rot.y * 180 / Math.PI).toFixed(1)}" step="1" />
                </div>
                <div class="property-row">
                    <label>Rotation Z</label>
                    <input type="number" id="prop-rz" value="${(node.transform.rot.z * 180 / Math.PI).toFixed(1)}" step="1" />
                </div>
                <div class="property-row">
                    <label>Scale X</label>
                    <input type="number" id="prop-sx" value="${node.transform.scale.x.toFixed(3)}" step="0.01" />
                </div>
                <div class="property-row">
                    <label>Scale Y</label>
                    <input type="number" id="prop-sy" value="${node.transform.scale.y.toFixed(3)}" step="0.01" />
                </div>
            </div>
        `;

        // Bind property change handlers
        this.bindPropertyHandlers(node);
    }

    private bindPropertyHandlers(node: Node): void {
        const bindInput = (id: string, handler: (value: string) => void) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', (e) => {
                    handler((e.target as HTMLInputElement).value);
                    node.update();
                });
            }
        };

        bindInput('prop-name', (v) => { node.name = v; });
        bindInput('prop-zsort', (v) => { node.zsort = parseFloat(v); });
        bindInput('prop-tx', (v) => { node.transform.trans.x = parseFloat(v); });
        bindInput('prop-ty', (v) => { node.transform.trans.y = parseFloat(v); });
        bindInput('prop-tz', (v) => { node.transform.trans.z = parseFloat(v); });
        bindInput('prop-rx', (v) => { node.transform.rot.x = parseFloat(v) * Math.PI / 180; });
        bindInput('prop-ry', (v) => { node.transform.rot.y = parseFloat(v) * Math.PI / 180; });
        bindInput('prop-rz', (v) => { node.transform.rot.z = parseFloat(v) * Math.PI / 180; });
        bindInput('prop-sx', (v) => { node.transform.scale.x = parseFloat(v); });
        bindInput('prop-sy', (v) => { node.transform.scale.y = parseFloat(v); });

        const enabledCheckbox = document.getElementById('prop-enabled') as HTMLInputElement;
        if (enabledCheckbox) {
            enabledCheckbox.addEventListener('change', () => {
                node.enabled = enabledCheckbox.checked;
                if (node.threeObj) {
                    node.threeObj.visible = node.enabled;
                }
            });
        }
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy(): void {
        if (this.scene) {
            this.scene.destroy();
        }
        this.container.innerHTML = '';
    }
}
