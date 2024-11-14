import { LightningElement } from 'lwc';
export default class ComponentTree extends LightningElement {
   componentName = '';
   parentComponent = '';
   childComponent = '';
   param = '';
   eventName = '';
   components = [];
   params = [];
   events = [];
   relationships = [];
   tree = [];
   errorMessage = '';
   generatedCode = false;
   componentCodes = [];
   message='';
   messageClass='message-hidden';
   messageJS='';
   messageClassJS='message-hidden';
   get componentOptions() {
       return this.components.map(component => ({ label: component, value: component }));
   }
   get filteredComponentOptions() {
       return this.components
           .filter(component => component !== this.parentComponent)
           .map(component => ({ label: component, value: component }));
   }
   handleComponentNameChange(event) {
       this.componentName = this.toCamelCase(event.target.value);
       this.errorMessage = ''; // Clear the error message when the input changes
   }
   handleParentChange(event) {
       this.parentComponent = event.target.value;
   }
   handleChildChange(event) {
       this.childComponent = event.target.value;
   }
   handleParamChange(event) {
       this.param = event.target.value;
   }
   handleEventChange(event) {
       this.eventName = event.target.value.toLowerCase();
   }
   addComponent() {
       if (this.componentName) {
            if(!/^[a-zA-Z]$/.test(this.componentName.charAt(0))){
                this.errorMessage = 'Component name should start with a letter';
                return;
            }
            if(!/^[a-zA-Z0-9]*$/.test(this.componentName)){
                    this.errorMessage = 'Component name should contain only letters and numbers';
                    return;
            }
            if (this.components.includes(this.componentName)) {
                this.errorMessage = 'Component name already exists!';
            } else {
                this.components = [...this.components, this.componentName];
                this.componentName = '';
                this.updateTree();
            }
       }
   }
   addParam() {
       if (this.param) {
           this.params = [...this.params, this.param];
           this.param = '';
       }
   }
   addEvent() {
       if (this.eventName) {
           this.events = [...this.events, this.eventName];
           this.eventName = '';
       }
   }
   addRelationship() {
       if (this.parentComponent && this.childComponent) {
           const existingRelationshipIndex = this.relationships.findIndex(
               rel => rel.parent === this.parentComponent && rel.child === this.childComponent
           );
           if (existingRelationshipIndex !== -1) {
                // Update the existing relationship
               const existingRelationship = this.relationships[existingRelationshipIndex];
               existingRelationship.params = [...new Set([...existingRelationship.params, ...this.params])];
               existingRelationship.events = [...new Set([...existingRelationship.events, ...this.events])];
                this.relationships = [...this.relationships];
           } else {
                // Add a new relationship
               this.relationships = [
                   ...this.relationships,
                   {
                       parent: this.parentComponent,
                       child: this.childComponent,
                       params: [...this.params],
                       events: [...this.events],
                   },
               ];
           }
           this.params = [];
           this.events = [];
           this.updateTree();
       }
   }
   updateTree() {
       const tree = [];
       this.components.forEach(component => {
           const children = this.relationships
               .filter(rel => rel.parent === component)
               .map(rel => ({
                   name: rel.child,
                   params: rel.params.join(', '),
                   events: rel.events.join(', '),
                   expanded: true, // Add expanded property for toggle functionality
               }));
           tree.push({ name: component, children, expanded: true });
       });
       this.tree = tree;
   }
   toggleNode(event) {
       const componentName = event.currentTarget.querySelector('p').textContent;
       this.tree = this.tree.map(node => {
           if (node.name === componentName) {
               node.expanded = !node.expanded;
           }
           return node;
       });
   }
   toKebabCase(str) {
       return str.replace(/\s+/g, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
   }
   toCamelCase(str) {
       return str.replace(/\s+/g, '').replace(/^[A-Z]/, c => c.toLowerCase());
   }
   generateCode() {
    const componentCodes = this.components.map(component => {
        const parentRels = this.relationships.filter(rel => rel.parent === component);
        const childRels = this.relationships.filter(rel => rel.child === component);
        let htmlCode = `
 <template>
 <lightning-card title="${component}">
 <!-- PLACEHOLDER:CHILDREN -->
 <!-- PLACEHOLDER:CHILD-PARAMS -->
 <!-- PLACEHOLDER:EVENTS -->
 </lightning-card>
 </template>`;
        let jsCode = `
 import { LightningElement, api } from 'lwc';
 export default class ${this.toCamelCase(component)} extends LightningElement {
    // PLACEHOLDER:TRACKVARS
    // PLACEHOLDER:METHODS
 }`;
        parentRels.forEach(rel => {
            const childTag = `
 <c-${this.toKebabCase(rel.child)} ${rel.params.map(param => `${this.toKebabCase(param)}={${this.toCamelCase(param)}}`).join(' ')} ${rel.events.map(event => `on${event}={${this.toCamelCase('handle' + event.charAt(0).toUpperCase() + event.slice(1))}}`).join(' ')}></c-${this.toKebabCase(rel.child)}>`;
            htmlCode = htmlCode.replace('<!-- PLACEHOLDER:CHILDREN -->', `${childTag}\n        <!-- PLACEHOLDER:CHILDREN -->`);
            // Add @track variables for params and events in parent if not already present
            rel.params.forEach(param => {
                const camelCasedParam = this.toCamelCase(param);
                if (!jsCode.includes(` ${camelCasedParam} = ''`)) {
                    jsCode = jsCode.replace('// PLACEHOLDER:TRACKVARS', `${camelCasedParam} = '';\n    // PLACEHOLDER:TRACKVARS`);
                    htmlCode = htmlCode.replace('<!-- PLACEHOLDER:CHILD-PARAMS -->', `
 <lightning-input style="margin: 20px" class="slds-col slds-size_1-of-1 slds-medium-size_6-of-12 slds-large-size_6-of-12" label="${param}" value={${camelCasedParam}} onchange={handle${camelCasedParam.charAt(0).toUpperCase() + camelCasedParam.slice(1)}Change}></lightning-input>
 <!-- PLACEHOLDER:CHILD-PARAMS -->`);
                }
            });
            rel.events.forEach(event => {
                const camelCasedEvent = this.toCamelCase(event);
                if (!jsCode.includes(`${camelCasedEvent} = ''`)) {
                    jsCode = jsCode.replace('// PLACEHOLDER:TRACKVARS', `${camelCasedEvent} = '';\n    // PLACEHOLDER:TRACKVARS`);
                }
                htmlCode = htmlCode.replace('<!-- PLACEHOLDER:EVENTS -->', `
 <div style="margin:20px">${event}: {${camelCasedEvent}}</div>
 <!-- PLACEHOLDER:EVENTS -->`);
            });
            // Add event handler methods in parent
            rel.events.forEach(event => {
                const methodName = `handle${event.charAt(0).toUpperCase() + event.slice(1)}`;
                if (!jsCode.includes(`${methodName}(event)`)) {
                    const methodCode = `
    ${methodName}(event) {
        this.${this.toCamelCase(event)} = event.detail.message;
    }`;
                    jsCode = jsCode.replace('// PLACEHOLDER:METHODS', `${methodCode}\n    // PLACEHOLDER:METHODS`);
                }
            });
            // Add input change handlers in parent
            rel.params.forEach(param => {
                const camelCasedParam = this.toCamelCase(param);
                const changeHandlerName = `handle${camelCasedParam.charAt(0).toUpperCase() + camelCasedParam.slice(1)}Change`;
                if (!jsCode.includes(`${changeHandlerName}(event)`)) {
                    const changeHandlerCode = `
    ${changeHandlerName}(event) {
        this.${camelCasedParam} = event.target.value;
    }`;
                    jsCode = jsCode.replace('// PLACEHOLDER:METHODS', `${changeHandlerCode}\n    // PLACEHOLDER:METHODS`);
                }
            });
        });
        childRels.forEach(rel => {
            if (rel.params.length > 0) {
                const childHtmlCode = rel.params.map(param => `<div style="margin:20px">${this.toKebabCase(param)}: {${this.toCamelCase(param)}}</div>`).join(' ');
                htmlCode = htmlCode.replace('<!-- PLACEHOLDER:CHILD-PARAMS -->', `
                ${childHtmlCode}
 <!-- PLACEHOLDER:CHILD-PARAMS -->`);
                rel.params.forEach(param => {
                    const camelCasedParam = this.toCamelCase(param);
                    if (!jsCode.includes(`@api ${camelCasedParam};`)) {
                        jsCode = jsCode.replace('// PLACEHOLDER:TRACKVARS', `@api ${camelCasedParam};\n    // PLACEHOLDER:TRACKVARS`);
                    }
                });
            }
            // Add event inputs, input handlers, and dispatchers in child component
            rel.events.forEach(event => {
                const camelCasedEvent = this.toCamelCase(event);
                const methodName = `handle${event.charAt(0).toUpperCase() + event.slice(1)}`;
                const inputHandlerName = `${methodName}Change`;
                if (!jsCode.includes(`${methodName}()`)) {
                    const methodCode = `
    ${methodName}() {
        const event = new CustomEvent('${event}', {
            detail: { message: this.${camelCasedEvent} }
        });
        this.dispatchEvent(event);
    }`;
                    const inputHandlerCode = `
    ${inputHandlerName}(event) {
        this.${camelCasedEvent} = event.target.value;
    }`;
                    jsCode = jsCode.replace('// PLACEHOLDER:TRACKVARS', `${camelCasedEvent} = '';\n    // PLACEHOLDER:TRACKVARS`);
                    jsCode = jsCode.replace('// PLACEHOLDER:METHODS', `${inputHandlerCode}\n    ${methodCode}\n    // PLACEHOLDER:METHODS`);
                    htmlCode = htmlCode.replace('<!-- PLACEHOLDER:CHILDREN -->', `
 <lightning-input style="margin:20px" class="slds-col slds-size_1-of-1 slds-medium-size_6-of-12 slds-large-size_6-of-12" label="${event}" value={${camelCasedEvent}} onchange={${inputHandlerName}}></lightning-input>
 <lightning-button style="margin:20px" onclick={${methodName}} label="Trigger ${event}"></lightning-button>
 <!-- PLACEHOLDER:CHILDREN -->`);
                }
            });
        });
        // Clean up placeholders
        htmlCode = htmlCode.replace('<!-- PLACEHOLDER:CHILDREN -->', '');
        htmlCode = htmlCode.replace('<!-- PLACEHOLDER:CHILD-PARAMS -->', '');
        htmlCode = htmlCode.replace('<!-- PLACEHOLDER:EVENTS -->', '');
        jsCode = jsCode.replace('// PLACEHOLDER:TRACKVARS', '');
        jsCode = jsCode.replace('// PLACEHOLDER:METHODS', '');
        return {
            component,
            html: htmlCode.trim(),
            js: jsCode.trim()
        };
    });
    this.componentCodes = componentCodes;
    this.generatedCode = true;
 }
copyHtmlCode(event) {
       const code = event.target.dataset.code;
       navigator.clipboard.writeText(code)
           .then(() => {
              this.message='HTML code copied to clipboard!';
              this.messageClass='message-visible';
              setTimeout(() => {
                this.message='';
                this.messageClass='message-hidden';
            },2000);
           })
           .catch(err => {
            this.message='Could not copy HTML code!';
            this.messageClass='message-visible';
            console.error('Could not copy HTML code: ', err);
           });
   }
   copyJsCode(event) {
       const code = event.target.dataset.code;
       navigator.clipboard.writeText(code)
           .then(() => {
            this.messageJS='JS code copied to clipboard!';
            setTimeout(() => {
                this.messageJS='';
                this.messageClassJS='message-hidden';
            },2000);
            this.messageClassJS='message-visible';
           })
           .catch(err => {
            this.message='Could not copy JS code!';
            this.messageClass='message-visible';
               console.error('Could not copy JS code: ', err);
           });
   }
}