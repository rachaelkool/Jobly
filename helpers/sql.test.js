const { sqlForPartialUpdate } = require("./sql");


describe('sqlForPartialUpdate', function () {
    test('correctly gives items', function () {
        const result = sqlForPartialUpdate(
            { c1: "v1", c2: "v2" },
            { js: "f2" });
        expect(result).toEqual({
        setCols: "\"c1\"=$1, \"c2\"=$2",
        values: ["v1", "v2"],
        });
    });
});