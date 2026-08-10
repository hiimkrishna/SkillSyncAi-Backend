import {
  getAllUsers,
  getPendingRecruiters,
  getRecruiterById,
  approveRecruiter,
  rejectRecruiter,
  updateRecruiter,
  suspendRecruiter,
  deleteRecruiter,
} from "./admin.service.js";

// Helper for standard error handling across controllers
const handleError = (error, request, reply) => {
  if (error.message === "Recruiter not found") {
    return reply.code(404).send({ message: error.message });
  }

  if (error.message === "No fields to update") {
    return reply.code(400).send({ message: error.message });
  }

  request.log.error(error);
  return reply.code(500).send({ message: "Internal server error" });
};

// ============================================
// GET ALL USERS
// ============================================
export const getAllUsersController = async (request, reply) => {
  try {
    const users = await getAllUsers();
    return reply.code(200).send({ users });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// GET PENDING RECRUITERS
// ============================================
export const getPendingRecruitersController = async (request, reply) => {
  try {
    const recruiters = await getPendingRecruiters();
    return reply.code(200).send({ recruiters });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// GET RECRUITER
// ============================================
export const getRecruiterController = async (request, reply) => {
  try {
    const { id } = request.params;
    const recruiter = await getRecruiterById(id);
    return reply.code(200).send({ recruiter });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// APPROVE RECRUITER
// ============================================
export const approveRecruiterController = async (request, reply) => {
  try {
    const { id } = request.params;
    const recruiter = await approveRecruiter(id);
    return reply.code(200).send({
      message: "Recruiter approved successfully",
      recruiter,
    });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// REJECT RECRUITER
// ============================================
export const rejectRecruiterController = async (request, reply) => {
  try {
    const { id } = request.params;
    const recruiter = await rejectRecruiter(id);
    return reply.code(200).send({
      message: "Recruiter rejected successfully",
      recruiter,
    });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// EDIT RECRUITER
// ============================================
export const updateRecruiterController = async (request, reply) => {
  try {
    const { id } = request.params;
    const recruiter = await updateRecruiter(id, request.body);
    return reply.code(200).send({
      message: "Recruiter updated successfully",
      recruiter,
    });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// SUSPEND RECRUITER
// ============================================
export const suspendRecruiterController = async (request, reply) => {
  try {
    const { id } = request.params;
    const recruiter = await suspendRecruiter(id);
    return reply.code(200).send({
      message: "Recruiter suspended successfully",
      recruiter,
    });
  } catch (error) {
    return handleError(error, request, reply);
  }
};

// ============================================
// DELETE RECRUITER
// ============================================
export const deleteRecruiterController = async (request, reply) => {
  try {
    const { id } = request.params;
    const recruiter = await deleteRecruiter(id);
    return reply.code(200).send({
      message: "Recruiter deleted successfully",
      recruiter,
    });
  } catch (error) {
    return handleError(error, request, reply);
  }
};