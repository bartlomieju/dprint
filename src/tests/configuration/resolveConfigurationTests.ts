import { expect } from "chai";
import * as os from "os";
import { Configuration, resolveConfiguration, ConfigurationDiagnostic, ResolvedConfiguration } from "../../configuration";

describe(nameof(resolveConfiguration), () => {
    function doTest(
        config: Configuration,
        expectedConfig: Partial<ResolvedConfiguration>,
        propertyFilter: (propName: keyof ResolvedConfiguration) => boolean,
        expectedDiagnostics: ConfigurationDiagnostic[] = []
    ) {
        const resolvedConfig = resolveConfiguration(config);
        for (const propName in resolvedConfig.config) {
            if (!propertyFilter(propName as keyof ResolvedConfiguration))
                delete (resolvedConfig.config as any)[propName];
        }

        expect(resolvedConfig.config).to.deep.equal(expectedConfig);
        expect(resolvedConfig.diagnostics).to.deep.equal(expectedDiagnostics);
    }

    describe("diagnostics", () => {
        it("should do a diagnostic when providing an incorrect number value", () => {
            doTest({ lineWidth: false as any as number }, {}, () => false, [{
                message: "Expected the configuration for 'lineWidth' to be a number, but its value was: false",
                propertyName: "lineWidth"
            }]);
        });

        it("should do a diagnostic when providing an incorrect boolean value", () => {
            doTest({ semiColons: 5 as any as boolean }, {}, () => false, [{
                message: "Expected the configuration for 'semiColons' to be a boolean, but its value was: 5",
                propertyName: "semiColons"
            }]);
        });

        it("should do a diagnostic when providing an excess property", () => {
            doTest({ asdf: 5 } as any, {}, () => false, [{
                message: "Unexpected property in configuration: asdf",
                propertyName: "asdf"
            }]);
        });
    });

    describe(nameof<Configuration>(c => c.lineWidth), () => {
        function doSpecificTest(value: number | undefined, expectedValue: number) {
            doTest({ lineWidth: value as any }, { lineWidth: expectedValue as any }, prop => prop === "lineWidth");
        }

        it("should set when not set", () => {
            doSpecificTest(undefined, 120);
        });

        it("should use what was set", () => {
            doSpecificTest(90, 90);
        });
    });

    describe(nameof<Configuration>(c => c.indentSize), () => {
        function doSpecificTest(value: number | undefined, expectedValue: number) {
            doTest({ indentSize: value as any }, { indentSize: expectedValue as any }, prop => prop === "indentSize");
        }

        it("should set when not set", () => {
            doSpecificTest(undefined, 4);
        });

        it("should use what was set", () => {
            doSpecificTest(2, 2);
        });
    });

    describe(nameof<Configuration>(c => c.useTabs), () => {
        function doSpecificTest(value: boolean | undefined, expectedValue: boolean) {
            doTest({ useTabs: value as any }, { useTabs: expectedValue as any }, prop => prop === "useTabs");
        }

        it("should set when not set", () => {
            doSpecificTest(undefined, false);
        });

        it("should use when set to the default", () => {
            doSpecificTest(true, true);
        });

        it("should use when not set to the default", () => {
            doSpecificTest(false, false);
        });
    });

    describe(nameof<Configuration>(c => c.semiColons), () => {
        function doSpecificTest(config: Configuration, expectedConfig: Partial<ResolvedConfiguration>) {
            doTest(config, expectedConfig, prop => prop.endsWith("semiColon"));
        }

        it("should set all the semi-colon values using the default", () => {
            doSpecificTest({}, getObject(true));
        });

        it("should set all the semi-colon values when using the default", () => {
            doSpecificTest({ semiColons: true }, getObject(true));
        });

        it("should set all the semi-colon values when set to a non-default", () => {
            doSpecificTest({ semiColons: false }, getObject(false));
        });

        it("should allow setting specific values when not the default", () => {
            const expectedConfig = getObject(false);
            const config: Configuration = { ...expectedConfig } as any;
            config.semiColons = true;
            doSpecificTest(config, expectedConfig);
        });

        function getObject(value: boolean): Partial<ResolvedConfiguration> {
            return {
                "breakStatement.semiColon": value,
                "continueStatement.semiColon": value,
                "debuggerStatement.semiColon": value,
                "directive.semiColon": value,
                "doWhileStatement.semiColon": value,
                "expressionStatement.semiColon": value,
                "ifStatement.semiColon": value,
                "importDeclaration.semiColon": value,
                "returnStatement.semiColon": value,
                "throwStatement.semiColon": value,
                "typeAlias.semiColon": value
            };
        }
    });

    describe(nameof<Configuration>(c => c.singleQuotes), () => {
        function doSpecificTest(value: boolean | undefined, expectedValue: boolean) {
            doTest({ singleQuotes: value as any }, { singleQuotes: expectedValue as any }, prop => prop === "singleQuotes");
        }

        it("should set when not set", () => {
            doSpecificTest(undefined, false);
        });

        it("should use when set to the default", () => {
            doSpecificTest(true, true);
        });

        it("should use when not set to the default", () => {
            doSpecificTest(false, false);
        });
    });

    describe(nameof<Configuration>(c => c.newLineKind), () => {
        function doSpecificTest(value: string | undefined, expectedValue: string) {
            doTest({ newLineKind: value as any }, { newLineKind: expectedValue as any }, prop => prop === "newLineKind");
        }

        it("should set when not set", () => {
            doSpecificTest(undefined, "auto");
        });

        it("should set when set to auto", () => {
            doSpecificTest("auto", "auto");
        });

        it("should set when set to crlf", () => {
            doSpecificTest("crlf", "\r\n");
        });

        it("should set when set to lf", () => {
            doSpecificTest("lf", "\n");
        });

        it("should resolve when set to system", () => {
            doSpecificTest("system", os.EOL === "\r\n" ? "\r\n" : "\n");
        });

        it("should do a diagnostic when providing an incorrect value", () => {
            doTest({ newLineKind: "asdf" as any }, {}, () => false, [{
                message: "Unknown configuration specified for 'newLineKind': asdf",
                propertyName: "newLineKind"
            }]);
        });
    });

    describe(nameof<Configuration>(c => c.useBraces), () => {
        function doSpecificTest(config: Configuration, expectedConfig: Partial<ResolvedConfiguration>) {
            doTest(config, expectedConfig, prop => prop.endsWith("useBraces"));
        }

        it("should set all the values using the default", () => {
            doSpecificTest({}, getObject("maintain"));
        });

        it("should set all the values when using the default", () => {
            doSpecificTest({ useBraces: "maintain" }, getObject("maintain"));
        });

        it("should set all the values when set to a non-default", () => {
            doSpecificTest({ useBraces: "always" }, getObject("always"));
        });

        it("should allow setting specific values when not the default", () => {
            const expectedConfig = getObject("always");
            const config: Configuration = { ...expectedConfig } as any;
            config.useBraces = "maintain";
            doSpecificTest(config, expectedConfig);
        });

        function getObject(value: NonNullable<Configuration["useBraces"]>): Partial<ResolvedConfiguration> {
            return {
                "ifStatement.useBraces": value,
                "whileStatement.useBraces": value
            };
        }
    });

    describe(nameof<Configuration>(c => c.bracePosition), () => {
        function doSpecificTest(config: Configuration, expectedConfig: Partial<ResolvedConfiguration>) {
            doTest(config, expectedConfig, prop => prop.endsWith("bracePosition"));
        }

        it("should set all the values using the default", () => {
            doSpecificTest({}, getObject("nextLineIfHanging"));
        });

        it("should set all the values when using the default", () => {
            doSpecificTest({ bracePosition: "nextLineIfHanging" }, getObject("nextLineIfHanging"));
        });

        it("should set all the values when set to a non-default", () => {
            doSpecificTest({ bracePosition: "nextLine" }, getObject("nextLine"));
        });

        it("should allow setting specific values when not the default", () => {
            const expectedConfig = getObject("nextLine");
            const config: Configuration = { ...expectedConfig } as any;
            config.bracePosition = "nextLineIfHanging";
            doSpecificTest(config, expectedConfig);
        });

        function getObject(value: NonNullable<Configuration["bracePosition"]>): Partial<ResolvedConfiguration> {
            return {
                "classDeclaration.bracePosition": value,
                "doWhileStatement.bracePosition": value,
                "functionDeclaration.bracePosition": value,
                "ifStatement.bracePosition": value,
                "tryStatement.bracePosition": value,
                "whileStatement.bracePosition": value
            };
        }
    });

    describe(nameof<Configuration>(c => c.nextControlFlowPosition), () => {
        function doSpecificTest(config: Configuration, expectedConfig: Partial<ResolvedConfiguration>) {
            doTest(config, expectedConfig, prop => prop.endsWith("nextControlFlowPosition"));
        }

        it("should set all the values using the default", () => {
            doSpecificTest({}, getObject("nextLine"));
        });

        it("should set all the values when using the default", () => {
            doSpecificTest({ nextControlFlowPosition: "nextLine" }, getObject("nextLine"));
        });

        it("should set all the values when set to a non-default", () => {
            doSpecificTest({ nextControlFlowPosition: "sameLine" }, getObject("sameLine"));
        });

        it("should allow setting specific values when not the default", () => {
            const expectedConfig = getObject("sameLine");
            const config: Configuration = { ...expectedConfig } as any;
            config.nextControlFlowPosition = "nextLine";
            doSpecificTest(config, expectedConfig);
        });

        function getObject(value: NonNullable<Configuration["nextControlFlowPosition"]>): Partial<ResolvedConfiguration> {
            return {
                "ifStatement.nextControlFlowPosition": value,
                "tryStatement.nextControlFlowPosition": value
            };
        }
    });
});
