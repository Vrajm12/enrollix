import {
  AssignmentConfirmationError,
  assertAssignmentConfirmed,
  getAssignmentConflicts
} from "../../../services/leadAssignmentService";

const lead = (id: number, assignedTo: number | null) => ({
  id,
  tenantId: 10,
  assignedTo
});

describe("leadAssignmentService assignment confirmation", () => {
  it("allows assigning unassigned leads without confirmation", () => {
    expect(() => {
      assertAssignmentConfirmed([lead(1, null)], 22, false);
    }).not.toThrow();
  });

  it("does not treat same-assignee updates as reassignment conflicts", () => {
    expect(getAssignmentConflicts([lead(1, 22), lead(2, null)], 22)).toEqual([]);
  });

  it("blocks reassignment unless explicitly confirmed", () => {
    expect(() => {
      assertAssignmentConfirmed([lead(1, 22)], 33, false);
    }).toThrow(AssignmentConfirmationError);
  });

  it("allows confirmed reassignment", () => {
    expect(() => {
      assertAssignmentConfirmed([lead(1, 22)], 33, true);
    }).not.toThrow();
  });

  it("blocks unassignment of owned leads unless explicitly confirmed", () => {
    const conflicts = getAssignmentConflicts([lead(1, 22)], null);

    expect(conflicts).toEqual([
      {
        leadId: 1,
        oldAssignedTo: 22,
        newAssignedTo: null
      }
    ]);
    expect(() => {
      assertAssignmentConfirmed([lead(1, 22)], null, false);
    }).toThrow(AssignmentConfirmationError);
  });
});
