/**
 * Convert OpenAI/Gemini tool schema and media into Antigravity/Gemini-compatible shapes.
 */

export function convertTool(tool) {
    const func = tool.function || tool;

    return {
        name: func.name,
        description: func.description || '',
        parameters: convertJsonSchema(func.parameters)
    };
}

/**
 * Convert JSON Schema (remove unsupported fields; optionally uppercase types).
 * Claude API requires JSON Schema draft 2020-12 compliant schemas.
 * @param {Object} schema JSON Schema
 * @param {boolean} uppercaseTypes Gemini expects uppercase; Claude expects lowercase.
 */
export function convertJsonSchema(schema, uppercaseTypes = true) {
    if (!schema) return undefined;

    // Handle primitive types passed directly (e.g., just a string instead of object)
    if (typeof schema !== 'object') {
        return schema;
    }

    const converted = { ...schema };

    // Remove fields not supported by Claude API / JSON Schema draft 2020-12
    delete converted.$schema;
    delete converted.$id;
    delete converted.$ref;
    delete converted.$defs;
    delete converted.definitions;
    delete converted.additionalProperties;
    delete converted.propertyNames;
    delete converted.default;
    delete converted.minLength;
    delete converted.maxLength;
    delete converted.minimum;
    delete converted.maximum;
    delete converted.minItems;
    delete converted.maxItems;
    delete converted.pattern;
    delete converted.format;
    delete converted.uniqueItems;
    delete converted.exclusiveMinimum;
    delete converted.exclusiveMaximum;
    delete converted.const;
    delete converted.if;
    delete converted.then;
    delete converted.else;
    delete converted.not;
    delete converted.contentEncoding;
    delete converted.contentMediaType;
    delete converted.deprecated;
    delete converted.readOnly;
    delete converted.writeOnly;
    delete converted.examples;
    delete converted.$comment;
    delete converted.title; // Some MCP tools include title, which can cause issues

    // Handle nullable field (convert to optional behavior)
    if (converted.nullable === true) {
        delete converted.nullable;
        // nullable is handled by making the field optional, no need to modify type
    }
    delete converted.nullable;

    // Handle anyOf/oneOf/allOf - try to extract a usable type
    if (converted.anyOf && Array.isArray(converted.anyOf)) {
        const extractedType = extractTypeFromUnion(converted.anyOf);
        if (extractedType) {
            converted.type = extractedType;
        }
        delete converted.anyOf;
    }

    if (converted.oneOf && Array.isArray(converted.oneOf)) {
        const extractedType = extractTypeFromUnion(converted.oneOf);
        if (extractedType) {
            converted.type = converted.type || extractedType;
        }
        delete converted.oneOf;
    }

    if (converted.allOf && Array.isArray(converted.allOf)) {
        // For allOf, merge properties from all schemas
        for (const subSchema of converted.allOf) {
            if (subSchema && typeof subSchema === 'object') {
                if (subSchema.properties && typeof subSchema.properties === 'object') {
                    converted.properties = { ...converted.properties, ...subSchema.properties };
                }
                if (subSchema.type && !converted.type) {
                    converted.type = subSchema.type;
                }
                if (subSchema.required && Array.isArray(subSchema.required)) {
                    converted.required = [...(converted.required || []), ...subSchema.required];
                }
            }
        }
        delete converted.allOf;
    }

    // Handle type field
    if (converted.type) {
        // Claude/Gemini doesn't support array types like ["string", "null"]
        // Extract the first non-null type when type is an array
        if (Array.isArray(converted.type)) {
            const nonNullType = converted.type.find(t => t !== 'null' && t !== null);
            converted.type = nonNullType || converted.type[0] || 'string';
        }

        if (uppercaseTypes && typeof converted.type === 'string') {
            converted.type = converted.type.toUpperCase();
        }
    }

    // Recursively convert nested properties
    if (converted.properties && typeof converted.properties === 'object') {
        const newProperties = {};
        for (const [key, value] of Object.entries(converted.properties)) {
            if (value && typeof value === 'object') {
                newProperties[key] = convertJsonSchema(value, uppercaseTypes);
            }
        }
        converted.properties = newProperties;
    }

    // Recursively convert array items
    if (converted.items) {
        if (Array.isArray(converted.items)) {
            // Tuple validation - take first item schema
            converted.items = converted.items[0]
                ? convertJsonSchema(converted.items[0], uppercaseTypes)
                : { type: uppercaseTypes ? 'STRING' : 'string' };
        } else {
            converted.items = convertJsonSchema(converted.items, uppercaseTypes);
        }
    }

    // Handle additionalItems (remove it)
    delete converted.additionalItems;
    delete converted.unevaluatedItems;
    delete converted.unevaluatedProperties;
    delete converted.prefixItems;
    delete converted.contains;
    delete converted.minContains;
    delete converted.maxContains;
    delete converted.patternProperties;
    delete converted.dependentRequired;
    delete converted.dependentSchemas;
    delete converted.propertyNames;

    return converted;
}

/**
 * Extract a usable type from anyOf/oneOf union schemas.
 * Prefers non-null primitive types.
 */
function extractTypeFromUnion(schemas) {
    if (!Array.isArray(schemas)) return null;

    for (const schema of schemas) {
        if (!schema || typeof schema !== 'object') continue;

        // Skip null type
        if (schema.type === 'null') continue;

        if (schema.type && typeof schema.type === 'string') {
            return schema.type;
        }

        // Handle nested arrays
        if (Array.isArray(schema.type)) {
            const nonNull = schema.type.find(t => t !== 'null');
            if (nonNull) return nonNull;
        }
    }

    return 'string'; // Default fallback
}

/**
 * Parse data URL (or raw base64) into {mimeType,data}
 */
export function parseDataUrl(url) {
    // support data URL or raw base64
    if (url.startsWith('data:')) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
            return {
                mimeType: match[1],
                data: match[2]
            };
        }
    }

    // assume raw base64 PNG
    return {
        mimeType: 'image/png',
        data: url
    };
}

/**
 * Generate sessionId
 */
export function generateSessionId() {
    return String(-Math.floor(Math.random() * 9e18));
}
